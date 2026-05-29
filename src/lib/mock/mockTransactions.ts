import type { Transaction } from "@/types";

const MIN = 60_000;

export function seedTransactions(now: number = Date.now()): Transaction[] {
  return [
    {
      id: "tx-0",
      type: "deposit",
      amount: 50,
      timestamp: now - 26 * MIN,
      signature: "Dep0sit5KQ9mNpXr7sT4eHvUgN6bJ8oPqRdSc1aLp3FzWvY2kDtBnH4xRfQ7mLpA9eUgJ1nQ5oPkTfVbAxZ6",
      status: "confirmed",
    },
    {
      id: "tx-1",
      type: "payout",
      amount: 49,
      timestamp: now - 11 * MIN,
      signature: "Pay0utSc1aLp3FzWvY2kDtBnH4xRfQ7mLpA9eUgJ1nQ5oPkTfVbAxZ6eK9mNpXr7sT4eHvUgN6bJ8oPqRdSc1",
      status: "confirmed",
    },
  ];
}
