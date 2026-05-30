export type CoinSide = "heads" | "tails";

export type GamePhase = "idle" | "pending" | "win" | "lose";

/**
 * Fine-grained lifecycle of a single flip, wired to the real Solana tx flow:
 * - idle               nothing in flight
 * - awaiting_signature waiting for the wallet (Phantom) to sign — coin spins
 * - confirming         tx submitted, awaiting on-chain confirmation — coin spins
 * - settled            confirmed + result fetched — coin lands once
 * - error              rejected / failed — coin returns smoothly to idle
 */
export type FlipStatus =
  | "idle"
  | "awaiting_signature"
  | "confirming"
  | "settled"
  | "error";

export type BetResult = "win" | "lose";

export interface Bet {
  id: string;
  /** epoch ms, used to render relative time */
  timestamp: number;
  side: CoinSide;
  /** landed side of the coin */
  outcome: CoinSide;
  amount: number;
  result: BetResult;
  /** net payout credited to the player (0 on a loss) */
  payout: number;
  /** Solana transaction signature (real, confirmed on Devnet) */
  signature: string;
  /** player wallet (base58) — set for on-chain/public history rows */
  player?: string;
  /** casino ledger balance after this flip, in SOL — when known from the event */
  newBalance?: number;
}

export interface Transaction {
  id: string;
  type: "deposit" | "withdraw" | "bet" | "payout";
  amount: number;
  timestamp: number;
  signature: string;
  status: "confirmed" | "pending";
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  /** SOL-denominated devnet wallet balance */
  walletBalance: number;
  /** SOL (lamports, as a float) held in the casino ledger/vault */
  casinoBalance: number;
}

export interface FlipOutcome {
  outcome: CoinSide;
  result: BetResult;
  payout: number;
  bet: Bet;
}

/** Async result envelope so swapping in real Solana calls keeps the same shape. */
export interface ServiceResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
