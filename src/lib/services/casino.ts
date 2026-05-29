/**
 * Casino service layer — SIMULATED.
 *
 * Every function here fakes a Solana Devnet round-trip (latency + a signature).
 * To go live, replace each body with real @solana/web3.js + Anchor program calls;
 * keep the signatures identical and the rest of the app needs no changes.
 */
import type { Bet, CoinSide, FlipOutcome, ServiceResult, WalletState } from "@/types";
import { CONNECTED_WALLET } from "@/lib/mock/mockWallet";
import { fakeSignature } from "@/lib/mock/signatures";
import { payoutFor } from "@/lib/config";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** small jitter so the UI feels like a real network */
const latency = (min: number, max: number) => delay(min + Math.random() * (max - min));

/** Simulate connecting a Solana wallet (e.g. Phantom) on Devnet. */
export async function connectWallet(): Promise<ServiceResult<WalletState>> {
  await latency(700, 1300);
  // TODO(solana): window.solana.connect() -> publicKey + getBalance()
  return { ok: true, data: { ...CONNECTED_WALLET } };
}

export async function disconnectWallet(): Promise<ServiceResult<null>> {
  await latency(150, 350);
  return { ok: true, data: null };
}

/** Move tokens from wallet into the casino vault. */
export async function depositTokens(
  amount: number,
): Promise<ServiceResult<{ signature: string }>> {
  await latency(900, 1600);
  if (amount <= 0) return { ok: false, error: "Enter an amount greater than zero." };
  // TODO(solana): transfer SPL token -> vault PDA, await confirmation
  return { ok: true, data: { signature: fakeSignature() } };
}

/** Withdraw tokens from the casino vault back to the wallet. */
export async function withdrawTokens(
  amount: number,
): Promise<ServiceResult<{ signature: string }>> {
  await latency(900, 1600);
  if (amount <= 0) return { ok: false, error: "Enter an amount greater than zero." };
  // TODO(solana): vault PDA -> player, await confirmation
  return { ok: true, data: { signature: fakeSignature() } };
}

/**
 * Place a coin-flip bet. Outcome is decided client-side here; on-chain this
 * becomes a verifiable randomness draw resolved by the program.
 */
export async function placeBet(
  side: CoinSide,
  amount: number,
): Promise<ServiceResult<FlipOutcome>> {
  await latency(1500, 2200);
  if (amount <= 0) return { ok: false, error: "Bet amount must be greater than zero." };

  // TODO(solana): program emits VRF outcome; read it from the tx logs instead.
  const outcome: CoinSide = Math.random() < 0.5 ? "heads" : "tails";
  const result = outcome === side ? "win" : "lose";
  const payout = result === "win" ? payoutFor(amount) : 0;

  const bet: Bet = {
    id: `bet-${Date.now()}`,
    timestamp: Date.now(),
    side,
    outcome,
    amount,
    result,
    payout,
    signature: fakeSignature(),
  };

  return { ok: true, data: { outcome, result, payout, bet } };
}
