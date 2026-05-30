# VibeFlip — Anchor program (`vibeflip`)

On-chain coin-flip casino program for Solana **Devnet**. Lean **native-SOL**
custodial-ledger model: lamports pool in one PDA-owned vault, and each player
has a `PlayerState` PDA holding an integer `balance` (lamports). Bets mutate the
ledger; only `deposit`/`withdraw` move real SOL.

> ⚠️ **Randomness is demo-grade.** `place_bet` derives the outcome from
> `sha256(slot, unix_timestamp, player, nonce, client_seed) mod 2`, which is
> **predictable to the player and manipulable by the slot leader**. This is
> acceptable only on Devnet with valueless SOL. For production, swap the
> `derive_outcome` source for a VRF (ORAO / Switchboard).

## Accounts
- **Vault** (`seeds = [b"vault"]`) — system-owned PDA holding the lamport
  bankroll; the PDA signs payouts. Pre-funded by the deployer.
- **PlayerState** (`seeds = [b"player", player]`) — per-player ledger balance + stats.

There is intentionally **no House config account, no solvency tracking, no
commit-reveal, no VRF, no min/max limits, and no SPL/multi-token support** — the
house edge (2%) is a hardcoded constant. This is the minimal program that
satisfies the challenge: connect, deposit, play, withdraw, verifiable on-chain.

## Instructions
- `deposit(amount)` — user-signed System transfer wallet → vault; credits ledger.
  Creates the `PlayerState` ledger on first use (`init_if_needed`).
- `withdraw(amount)` — PDA-signed System transfer vault → wallet; debits ledger (guarded).
- `place_bet(side, amount, client_seed)` — validates balance, derives the outcome,
  applies the 2% edge atomically against the ledger, emits a `FlipResult` event.

Edge math (integer basis points, `EDGE_BPS = 200`):
`payout_total = amount * 2 * (10000 - edge_bps) / 10000`, `net_win = payout_total - amount`.
At 2%: a win nets `+0.96 * amount`, a loss `-amount`.

## Prerequisites
```bash
# Rust + Solana CLI + Anchor (via avm)
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.30.1 && avm use 0.30.1
solana config set --url devnet
solana-keygen new            # if you don't have ~/.config/solana/id.json
solana airdrop 2             # devnet SOL for deploys
```

## Build / test / deploy
```bash
cd anchor
yarn install            # or npm install
anchor keys sync        # writes the real program id into lib.rs + Anchor.toml
anchor build            # compiles + generates target/idl + target/types
anchor test             # spins up a local validator and runs tests/vibeflip.ts
anchor deploy --provider.cluster devnet
```

### No local toolchain? Use Solana Playground
If you can't install the toolchain locally (e.g. on Windows), build + deploy in
the browser at **https://beta.solpg.io**:
1. Create a new Anchor project, replace `src/lib.rs` with this program.
2. Connect a Playground wallet, airdrop Devnet SOL.
3. `Build`, then `Deploy`. Copy the deployed program id.
4. Download the IDL (`Export` / the `target/idl` panel) for the frontend.

## Fund the bankroll
After deploy, send Devnet SOL to the **vault PDA** so winning withdrawals are
covered (the PDA is derived from `[b"vault"]` and the program id):
```bash
solana transfer <VAULT_PDA> 2 --allow-unfunded-recipient --url devnet
```

## Wiring into the frontend (next step)
After build, copy the generated artifacts to the web app and record the
deployed addresses:
- IDL → import for `@coral-xyz/anchor` `Program`.
- Program ID + vault PDA → `src/lib/config.ts` `ONCHAIN`.

Then replace the simulated calls in `src/lib/services/casino.ts`
(`deposit`/`withdraw`/`placeBet`) with `program.methods.*().rpc()` calls — the
`ServiceResult` shapes already match, so the UI needs no changes.
