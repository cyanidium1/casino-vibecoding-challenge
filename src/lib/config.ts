/** Central product/game constants — the swap-in points for real Solana values. */
export const CASINO = {
  name: "VibeFlip",
  tokenSymbol: "SOL",
  network: "Solana Devnet",
  /** house edge applied to the fair 2x payout */
  edge: 0.02,
  minBet: 0.05,
  maxBet: 5,
  quickAmounts: [0.1, 0.25, 0.5] as const,
  explorerBase: "https://explorer.solana.com",
  explorerCluster: "devnet",
} as const;

/**
 * On-chain identifiers. `programId` must match `declare_id!` in the deployed
 * program; `vaultAddress` is the PDA derived from `[b"vault"]`. After you
 * deploy (e.g. via Solana Playground), update `programId` here and in
 * `src/lib/solana/vibeflip.json` (`address`), then re-derive the vault.
 */
export const ONCHAIN = {
  programId: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
  vaultAddress: "BtWhNzGgdC9aX14VfQtYQuiqvxidMSAzParX6UUXzgn2",
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
