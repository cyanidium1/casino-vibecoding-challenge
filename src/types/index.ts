export type CoinSide = "heads" | "tails";

export type GamePhase = "idle" | "pending" | "win" | "lose";

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
  /** fake Solana transaction signature */
  signature: string;
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
  /** VIBE tokens held inside the casino vault */
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
