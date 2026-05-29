# VibeFlip Casino — Solana Integration Research & Implementation Plan

> Status: research phase. The app currently ships as a **fully simulated** frontend
> (see [`src/lib/services/casino.ts`](../src/lib/services/casino.ts),
> [`src/context/CasinoProvider.tsx`](../src/context/CasinoProvider.tsx),
> [`src/lib/config.ts`](../src/lib/config.ts)). This document is the plan to replace
> the mock seam with real Solana Devnet logic without rewriting the UI.

This research draws on official Anchor/Solana docs, the Solana wallet-adapter guides,
Switchboard/ORAO randomness docs, and patterns (not code) from the public repos:
`solana-developers/solana-game-examples` (coin-flip), `solana-developers/anchor-web3js-nextjs`,
`aeminium-labs/nextjs-solana-starter-kit`, `NarsiBhati-Dev/solana-starter`,
`justFiveDev/Solana-Casino-Coinflip-Game`, `ddm50/solana-coinflip-game`.

---

## Architecture Overview

Three layers, with a deliberately thin, swappable boundary between the UI and the chain:

```
┌──────────────────────────────────────────────────────────────┐
│ UI layer (DONE, unchanged)                                     │
│  Hero · CoinFlipGame · WalletPanel · BetHistory · Fairness     │
│  consumes useCasino() from CasinoProvider — knows nothing      │
│  about web3                                                    │
├──────────────────────────────────────────────────────────────┤
│ Adapter layer (the seam we replace)                            │
│  CasinoProvider  ──>  src/lib/services/casino.ts               │
│  connectWallet / depositTokens / withdrawTokens / placeBet     │
│  Today: setTimeout + fake signatures.                          │
│  Target: wallet-adapter + @coral-xyz/anchor Program calls.     │
├──────────────────────────────────────────────────────────────┤
│ Chain layer (to build)                                         │
│  Anchor program `vibeflip` on Devnet                           │
│   • PlayerState PDA (custodial ledger balance)                 │
│   • House vault PDA (SPL token account, PDA-owned)             │
│   • instructions: init_player, deposit, withdraw, place_bet    │
│  SPL token "VIBE" mint on Devnet                               │
└──────────────────────────────────────────────────────────────┘
```

**Key decisions**
- **Keep the service-function signatures.** `placeBet(side, amount)` etc. already return a
  `ServiceResult<T>` envelope. Real implementations resolve the same shape, so
  `CasinoProvider` and every component continue to work untouched.
- **Custodial ledger balance model** (Casino Balance Model (a) below): one shared house
  vault token account + a per-player `PlayerState` PDA storing a `balance: u64`. Bets mutate
  the integer; only deposit/withdraw move real tokens. This minimizes per-bet CPIs, makes
  bet settlement atomic, and matches the "casino balance" concept already in the UI.
- **SPL token "VIBE"** (a custom Devnet mint) rather than native SOL, so the product reads as
  a casino token. SOL stays as the gas/"wallet balance" already shown in `WalletPanel`.
- **Wallet:** `@solana/wallet-adapter-react` with Wallet-Standard auto-detection (Phantom
  self-registers — no explicit Phantom adapter needed).

---

## Solana Integration Plan

Step-by-step order, frontend and program interleaved so each step is demoable:

1. **Devnet + token setup.** Configure Solana CLI to Devnet, create a "VIBE" SPL mint
   (`spl-token create-token`), create the house ATA, mint supply, fund a test wallet.
2. **Wallet provider.** Add a `"use client"` `SolanaProvider` wrapping
   `ConnectionProvider → WalletProvider → WalletModalProvider`; mount it in
   `app/layout.tsx` alongside (inside) the existing `CasinoProvider`.
3. **Wire connect/disconnect.** Replace `connectWallet()`/`disconnectWallet()` in the service
   with `useWallet()` state; populate `walletBalance` from `connection.getBalance` and
   `casinoBalance` from the player's token balance / PlayerState.
4. **Author the Anchor program** (`init_player`, `deposit`, `withdraw`, `place_bet`), build,
   and deploy to Devnet. Capture the real Program ID + vault address into
   `src/lib/config.ts` `ONCHAIN`.
5. **Generate IDL + types** (`anchor build`) and add a `useProgram()` hook that builds an
   `AnchorProvider` + `Program` from the connected wallet.
6. **Wire deposit/withdraw** to `program.methods.deposit/withdraw(...).rpc()` with proper
   confirmation; refresh balances after confirm.
7. **Wire place_bet** to the on-chain flip; read the outcome from the confirmed tx / fetched
   account and feed the existing `gamePhase` state machine.
8. **Real signatures everywhere.** Replace `fakeSignature()` usages; `BetHistory`,
   `TransactionLink`, and the Fairness panel "Last Transaction" already render whatever
   signature they're given — they light up automatically.
9. **Fairness surfacing.** Show the committed seed hash pre-bet and the revealed seed +
   Explorer link post-bet.
10. **Hardening.** Error/timeout handling, blockhash-expiry retries, insufficient-balance and
    solvency guards, loading states (already present in the UI).

---

## Smart Contract Plan

Anchor program `vibeflip` (crates: `anchor-lang`, `anchor-spl`).

**State accounts**
- `House` (singleton PDA, `seeds = [b"house"]`) — `authority`, `vault_bump`, `edge_bps: u16`
  (= 200 for 2%), `min_bet`, `max_bet`, `nonce_counter: u64`, optional `seed_commitment: [u8;32]`.
- `Vault` — an SPL **token account owned by a PDA** (`seeds = [b"vault"]`), holds the VIBE
  bankroll + escrow. PDA authority signs withdrawals.
- `PlayerState` (per player, `seeds = [b"player", player.key()]`) — `balance: u64`,
  `bet_count: u64`, `last_result`.

**Instructions**
- `init_house(edge_bps, min, max)` — admin-only; creates House + vault, sets params.
- `init_player()` — `init_if_needed` PlayerState for the signer.
- `deposit(amount)` — `token::transfer` CPI (user ATA → vault, **user signs**); credit
  `player.balance += amount`.
- `withdraw(amount)` — `require!(player.balance >= amount)`; `token::transfer` CPI
  (vault → user ATA, **PDA signs** via `new_with_signer([b"vault", &[bump]])`);
  `player.balance -= amount`.
- `place_bet(side: u8, amount, client_seed)` — validate against min/max and
  `player.balance`; solvency check `require!(effective_bankroll >= payout)`; derive outcome;
  on win `player.balance += net_win`, on loss `player.balance -= amount`; bump `nonce_counter`.

**Conventions:** 8-byte discriminator in every `space`; `#[error_code]` for
`BetTooSmall/BetTooLarge/InsufficientBalance/HouseInsolvent`; emit an `event!` per flip so the
frontend/Explorer can read structured results.

---

## Deposit / Withdraw Flow

**Deposit (wallet → casino balance)**
1. UI `DepositModal` → `deposit(amount)` (unchanged).
2. Ensure player's VIBE ATA exists (create ATA ix if needed).
3. Build `program.methods.deposit(new BN(amount)).accounts({ house, vault, playerState, userAta, mint, tokenProgram, ... }).rpc()`.
4. `getLatestBlockhash` → send → `confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')`.
5. On confirm: re-fetch `PlayerState.balance` → update `casinoBalance`; push a real
   `deposit` transaction with the actual signature.

**Withdraw (casino balance → wallet)** — mirror image; the program's PDA signs the
vault→user transfer. Guarded by `player.balance >= amount`. Use `'finalized'` commitment for
withdrawals (irreversible payout) vs `'confirmed'` for snappier deposits/bets.

Tokens physically live in **one pooled vault**; the per-player integer ledger is the source of
truth for "casino balance," exactly as the UI already presents it.

---

## Coin Flip Flow

Complete lifecycle of one bet (single-transaction settle, the realistic weekend design):

1. **Select** — player picks heads/tails + stake in `CoinFlipGame`; UI shows potential payout
   `amount * 2 * (1 - edge)` (already computed in `config.ts payoutFor`).
2. **Submit** — `flip(side, amount)` → `place_bet` instruction. `gamePhase = "pending"`, coin
   starts spinning (already wired).
3. **Resolve on-chain** — program computes outcome from the randomness source (see Fairness),
   compares to `side`, applies edge math, mutates `player.balance`, emits a `FlipResult` event.
4. **Confirm** — frontend confirms the tx, then reads the outcome from the emitted event (or
   re-fetches `PlayerState`).
5. **Settle UI** — set `gamePhase` to `win`/`lose`, land the coin on the real outcome, update
   `casinoBalance`, prepend the real `Bet` (with real signature) to `BetHistory`, refresh the
   Fairness panel's "Last Transaction".
6. **Verify** — `TransactionLink` deep-links the settlement tx to Solana Explorer
   (`https://explorer.solana.com/tx/<sig>?cluster=devnet`).

Note the UI state machine (`idle → pending → win|lose`) and all these surfaces already exist;
only the data source changes.

---

## Fairness Strategy

**For the 48h Devnet build (recommended): on-chain pseudo-randomness + commit-reveal display.**
- Outcome = `hash(slot, Clock.unix_timestamp, recent_blockhash, player.key, nonce_counter, client_seed)`,
  taken mod 2. Single transaction, **no oracle dependency**, ships fast.
- Wrap it in a **commit-reveal seed display** for credibility: the house publishes
  `sha256(serverSeed)` before play; after each bet, reveal `serverSeed` + nonce so the user can
  re-derive the result. Expose seed hash, revealed seed, nonce, and the Explorer link in the
  existing Fairness section.
- **Be explicit in the README and UI** that this pseudo-randomness is **demo-grade and
  validator-manipulable** — acceptable only because Devnet has no real value.

**For production: a verifiable VRF.**
- **ORAO VRF** — cheapest/simplest (~0.001 SOL/request, simple SDK) — lowest-effort upgrade.
- **Switchboard On-Demand** — most established; SGX-backed, single-tx callbacks.
- Chainlink VRF is **not** available on Solana — do not plan around it.
- VRF converts the flow to request → fulfill (callback) → settle and removes both validator
  manipulation and outcome precomputation/front-running.

---

## Risks

- **Randomness manipulation (highest).** Blockhash/slot/clock are influenceable by the slot
  leader and predictable to the player, who could submit only favorable bets. Mitigation:
  commit guess before randomness is known; VRF for production. Documented as demo-only.
- **House insolvency.** A win streak could drain the vault. Mitigation: per-bet solvency
  check + `max_bet` cap as a fraction of bankroll.
- **Custodial trust.** The ledger model means the program holds funds; a program bug =
  loss. Mitigation: minimal instruction surface, `init_if_needed` re-init guards, tests, and
  (ideally) an audit before any real value.
- **Blockhash expiry / dropped tx.** Confirmations can hang with the deprecated single-arg
  `confirmTransaction`. Mitigation: always pass `{ signature, blockhash, lastValidBlockHeight }`
  and implement retry/expiry handling.
- **Next.js App Router SSR.** Wallet UI touches `window`; providers must be `"use client"` and
  the wallet button dynamically imported with `ssr: false` to avoid hydration errors.
- **RPC rate limits.** Public Devnet RPC throttles; use a dedicated Devnet RPC for the demo.
- **Float rounding on-chain.** Keep edge/payout math in integer basis points (edge_bps = 200),
  not floats.

---

## MVP Scope

Absolute minimum to call the integration "real on Devnet":
1. Wallet connect/disconnect via wallet-adapter (Phantom), Devnet.
2. VIBE SPL mint + pooled house vault deployed.
3. Anchor program with `init_player`, `deposit`, `withdraw`, `place_bet` deployed to Devnet.
4. Deposit and withdraw working end-to-end with real confirmed transactions.
5. `place_bet` with pseudo-randomness, correct 2% edge math, atomic settle.
6. Real balances, real bet history, real Explorer links populated from chain data.
7. Honest fairness disclosure (demo-grade randomness) in UI + README.

---

## Stretch Goals

- ORAO (or Switchboard) VRF for genuinely verifiable randomness.
- Full provably-fair commit-reveal with on-chain seed commitment + a "Verify" tool that
  recomputes the outcome in the browser.
- Live bankroll/house-stats account read on-chain; leaderboard from program events.
- WebSocket/`onLogs` subscription for a real-time global bet feed (other players' flips).
- Auto-create ATA + a Devnet "faucet" button that airdrops test VIBE.
- Bet streak multipliers / configurable risk; sound + richer win animations.
- Anchor test suite + CI; basic security review.

---

## Recommended Implementation Order

Exact task order (each item independently testable):

1. CLI → Devnet; create VIBE mint + house ATA + mint test supply.
2. Scaffold Anchor workspace (`anchor init vibeflip`); set Devnet in `Anchor.toml`.
3. Implement `House`/`Vault`/`PlayerState` accounts + `init_house`, `init_player`.
4. Implement `deposit` (user-signed transfer + balance credit) + Anchor tests.
5. Implement `withdraw` (PDA-signed transfer + balance debit) + tests.
6. Implement `place_bet` (validation, pseudo-random outcome, edge math, settle, event) + tests.
7. `anchor deploy` to Devnet; record Program ID + vault into `src/lib/config.ts` `ONCHAIN`.
8. Frontend: add `SolanaProvider` (`"use client"`) + mount in `layout.tsx`; dynamic wallet button.
9. Add `useProgram()` (AnchorProvider + Program from IDL/types).
10. Swap `connectWallet`/`disconnectWallet` in `services/casino.ts` for wallet-adapter state;
    real balance fetches.
11. Swap `depositTokens`/`withdrawTokens` for `program.methods` calls + confirmation.
12. Swap `placeBet` for `place_bet`; read outcome from event/account; drive `gamePhase`.
13. Replace all `fakeSignature()` with real signatures; verify `BetHistory` / `TransactionLink` /
    Fairness "Last Transaction" populate from chain.
14. Add fairness commit-reveal display + README disclosure.
15. Hardening pass: errors, retries, solvency/limit guards, RPC config, final Devnet QA.
16. (Stretch) VRF swap-in for the randomness source only — isolated change in `place_bet`.

---

### Sources
- Solana — Add Wallet Adapter to Next.js: https://solana.com/developers/guides/wallets/add-solana-wallet-adapter-to-nextjs
- Solana — Transaction Confirmation: https://solana.com/developers/guides/advanced/confirmation
- Anchor — Program Module / CPI / TS client: https://www.anchor-lang.com/docs
- QuickNode — Transfer SOL & SPL tokens with Anchor: https://www.quicknode.com/guides/solana-development/anchor/transfer-tokens
- Solana coin-flip example: https://github.com/solana-developers/solana-game-examples/tree/main/coin-flip
- On-chain randomness analysis: https://www.adevarlabs.com/blog/on-chain-randomness-on-solana-predictability-manipulation-safer-alternatives-part-1
- ORAO VRF: https://github.com/orao-network/solana-vrf · Switchboard Randomness: https://docs.switchboard.xyz/randomness
- Solana Explorer (Devnet): https://explorer.solana.com/?cluster=devnet
