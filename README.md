# VibeFlip — Verifiable Coin-Flip Casino (Solana Devnet)

A provably-auditable coin-flip casino running on **Solana Devnet** with **native
SOL**. Connect Phantom, deposit SOL into a program-owned vault, flip heads/tails
against a fixed **2% house edge**, and withdraw — every flip is settled by an
on-chain Anchor program and verifiable on the Solana Explorer.

> **Testnet only.** Devnet SOL has no monetary value. The randomness is
> demo-grade (see *Hardest unknown* below) and must not be used with real funds.

- **Live URL:** _<add Vercel URL after deploy>_
- **Program (Devnet):** `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS` _(replace with your deployed id)_
- **Vault PDA:** `BtWhNzGgdC9aX14VfQtYQuiqvxidMSAzParX6UUXzgn2`

---

## What works

- **Wallet** — Phantom via Solana Wallet-Standard / wallet-adapter; connect, disconnect, autoconnect.
- **Deposit** — wallet → vault PDA (System transfer), credited to an on-chain `PlayerState` ledger.
- **Coin flip** — `place_bet(side, amount, client_seed)` settles atomically against the ledger, applies the 2% edge, and emits a `FlipResult` event.
- **Withdraw** — vault PDA → wallet (PDA-signed System transfer), debited from the ledger and guarded against overdraw.
- **Explorer verification** — every deposit/bet/withdraw returns a real signature linked to `explorer.solana.com/tx/<sig>?cluster=devnet`; the Fairness section links the program + vault accounts.
- **UX** — animated parallax landing, live balances read from chain, bet history, polished modals.

## What doesn't (intentionally out of scope)

- **No VRF.** Outcome is `sha256(slot, unix_timestamp, player, nonce, client_seed) mod 2` — deterministic and slot-leader-manipulable. Devnet-only.
- **No house config / solvency accounting.** The edge is a hardcoded constant; the bankroll is just the vault's lamports. If the vault runs dry, a winning *withdraw* fails (the ledger still credits the win).
- **No commit-reveal, no min/max-bet accounts, no SPL/multi-token, no other games.** Deliberately lean to maximize the chance of a working end-to-end submission.

## Why Solana

Sub-second confirmations and tiny fees make a "flip → settle → verify" loop feel
instant, which is exactly what a casino UX needs. Anchor's PDA model gives a
clean custodial vault (one program-owned account signs all payouts) and the IDL
makes the frontend integration type-safe. Devnet has a faucet, so testers can
get valueless SOL in seconds.

## Hardest unknown

**On-chain randomness.** A coin flip is trivial off-chain but adversarial
on-chain: any value a validator can see or influence (slot, clock, recent
blockhash) is exploitable, and a naive `Clock`-based hash is predictable to the
player. The honest fix is a VRF (ORAO / Switchboard) with a request/callback
flow, which roughly doubles the instruction surface and adds a dependency. For a
48-hour devnet build I chose a transparent, clearly-labelled pseudo-random
derivation and documented its weakness rather than ship a half-wired VRF.

## What's next

1. Swap `derive_outcome` for a Switchboard/ORAO VRF (commit-request, settle in the callback).
2. Add a House account with min/max limits and real solvency checks before accepting a bet.
3. Parse the `FlipResult` event from tx logs instead of diffing ledger balance.
4. Migrate to mainnet-beta with an SPL house token and audited payout math.

---

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000  (Devnet RPC by default)
```

Optional custom RPC (avoids the public devnet rate limit):

```bash
echo 'NEXT_PUBLIC_SOLANA_RPC=https://your-devnet-rpc' > .env.local
```

## Deploy the program to Devnet

The Anchor workspace lives in [`anchor/`](anchor/) — see its
[README](anchor/README.md) for the full toolchain path. If you don't have the
local toolchain (e.g. on Windows), the fastest route is **Solana Playground**
(https://beta.solpg.io):

1. New Anchor project → paste [`anchor/programs/vibeflip/src/lib.rs`](anchor/programs/vibeflip/src/lib.rs).
2. Connect a Playground wallet, airdrop ~2 Devnet SOL, then **Build** and **Deploy**.
3. Copy the deployed **program id** and **export the IDL**.
4. Update the program id in **two** places — [`src/lib/solana/vibeflip.json`](src/lib/solana/vibeflip.json) (`address`) and [`src/lib/config.ts`](src/lib/config.ts) (`ONCHAIN.programId`) — and replace the exported IDL into `src/lib/solana/vibeflip.json` if your build differs.
5. **Fund the bankroll** so winning withdrawals are covered (re-derive the vault PDA for your program id):

   ```bash
   solana transfer <VAULT_PDA> 2 --allow-unfunded-recipient --url devnet
   ```

6. Re-derive and update `ONCHAIN.vaultAddress` in [`src/lib/config.ts`](src/lib/config.ts).

The hardcoded id/PDA above match the placeholder `declare_id!`; **you must
redeploy under your own keypair** and update these values — you cannot upgrade a
program you don't hold the key for.

## Deploy the frontend (Vercel)

```bash
# push to GitHub, then import the repo in Vercel
# Framework preset: Next.js (zero config). Optionally set NEXT_PUBLIC_SOLANA_RPC.
```

## AI tooling note

Built with **Claude Code** (Anthropic) as the primary pair-programmer: scaffolding
the Next.js app, authoring the Anchor program + IDL, wiring the wallet-adapter
integration, and iterating on the parallax UI. The lean-MVP scope (native SOL,
no VRF/solvency) was a deliberate human decision to prioritize a working,
verifiable end-to-end flow over engineering completeness within the deadline.
