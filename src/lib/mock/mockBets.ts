import type { Bet } from "@/types";
import { payoutFor } from "@/lib/config";

const MIN = 60_000;

/** Seed bet history. Timestamps are relative to load so "x min ago" stays fresh. */
export function seedBets(now: number = Date.now()): Bet[] {
  const rows: Array<
    Pick<Bet, "side" | "outcome" | "amount"> & { agoMs: number; sig: string }
  > = [
    { side: "heads", outcome: "heads", amount: 5, agoMs: 0.4 * MIN, sig: "5KQ9mNpXr7sT4eHvUgN6bJ8oPqRdSc1aLp3FzWvY2kDtBnH4xRfQ7mLpA9eUgJ1nQ5oPkTfVbAxZ6eUgJ1nQ" },
    { side: "tails", outcome: "heads", amount: 10, agoMs: 1.5 * MIN, sig: "3FzWvY2kDtBnH4xRfQ7mLpA9eUgJ1nQ5oPkTfVbAxZ6eK9mNpXr7sT4eHvUgN6bJ8oPqRdSc1aLp3FzWvY2kD" },
    { side: "heads", outcome: "heads", amount: 1, agoMs: 3 * MIN, sig: "9aLp3FzWvY2kDtBnH4xRfQ7mLpA9eUgJ1nQ5oPkTfVbAxZ6eK9mNpXr7sT4eHvUgN6bJ8oPqRdSc1aLpQ7mLp" },
    { side: "tails", outcome: "tails", amount: 25, agoMs: 5 * MIN, sig: "tBnH4xRfQ7mLpA9eUgJ1nQ5oPkTfVbAxZ6eK9mNpXr7sT4eHvUgN6bJ8oPqRdSc1aLp3FzWvY2kDtBnH4xRfQ" },
    { side: "heads", outcome: "tails", amount: 2, agoMs: 7 * MIN, sig: "eUgJ1nQ5oPkTfVbAxZ6eK9mNpXr7sT4eHvUgN6bJ8oPqRdSc1aLp3FzWvY2kDtBnH4xRfQ7mLpA9eUgJ1nQ5o" },
    { side: "tails", outcome: "tails", amount: 50, agoMs: 11 * MIN, sig: "Sc1aLp3FzWvY2kDtBnH4xRfQ7mLpA9eUgJ1nQ5oPkTfVbAxZ6eK9mNpXr7sT4eHvUgN6bJ8oPqRdSc1aLp3Fz" },
    { side: "heads", outcome: "heads", amount: 5, agoMs: 16 * MIN, sig: "Xr7sT4eHvUgN6bJ8oPqRdSc1aLp3FzWvY2kDtBnH4xRfQ7mLpA9eUgJ1nQ5oPkTfVbAxZ6eK9mNpXr7sT4eHv" },
    { side: "tails", outcome: "heads", amount: 3, agoMs: 24 * MIN, sig: "Q7mLpA9eUgJ1nQ5oPkTfVbAxZ6eK9mNpXr7sT4eHvUgN6bJ8oPqRdSc1aLp3FzWvY2kDtBnH4xRfQ7mLpA9eU" },
  ];

  return rows.map((r, i) => {
    const result = r.side === r.outcome ? "win" : "lose";
    return {
      id: `seed-${i}`,
      timestamp: now - r.agoMs,
      side: r.side,
      outcome: r.outcome,
      amount: r.amount,
      result,
      payout: result === "win" ? payoutFor(r.amount) : 0,
      signature: r.sig,
    } satisfies Bet;
  });
}
