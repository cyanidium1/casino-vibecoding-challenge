/** Central product/game constants — the swap-in points for real Solana values. */
export const CASINO = {
  name: "VibeFlip",
  tokenSymbol: "VIBE",
  network: "Solana Devnet",
  /** house edge applied to the fair 2x payout */
  edge: 0.02,
  minBet: 0.5,
  maxBet: 100,
  quickAmounts: [1, 5, 10] as const,
  explorerBase: "https://explorer.solana.com",
  explorerCluster: "devnet",
} as const;

/** Placeholder on-chain identifiers (replace with deployed program data). */
export const ONCHAIN = {
  programId: "Vib3F1ipXyZ7mQ2kRtnW9aLpScD4eHvUgN6bJ8oPqR",
  vaultAddress: "VauLt9kQ2mNpXr7sT4eHvUgN6bJ8oPqRdSc1aLp3FzW",
} as const;

/** payout for a winning flip: 2x stake minus house edge. */
export function payoutFor(amount: number): number {
  return amount * 2 * (1 - CASINO.edge);
}

export function explorerTx(signature: string): string {
  return `${CASINO.explorerBase}/tx/${signature}?cluster=${CASINO.explorerCluster}`;
}

export function explorerAddress(address: string): string {
  return `${CASINO.explorerBase}/address/${address}?cluster=${CASINO.explorerCluster}`;
}
