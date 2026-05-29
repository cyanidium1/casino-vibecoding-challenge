"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import StatusBadge from "@/components/shared/StatusBadge";
import TransactionLink from "@/components/shared/TransactionLink";
import { useCasino } from "@/context/CasinoProvider";
import { relativeTime, formatToken } from "@/lib/utils/format";
import { CASINO } from "@/lib/config";
import { cn } from "@/lib/utils/cn";
import type { Bet } from "@/types";

export default function BetHistory() {
  const { bets } = useCasino();
  const [now, setNow] = useState(() => Date.now());

  // keep relative timestamps fresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="vf-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-[16px] font-bold tracking-tight text-white">
            Recent Flips
          </span>
          <StatusBadge tone="live">Live feed</StatusBadge>
        </div>
        <span className="vf-mono text-[11px] text-white/35">{bets.length} bets</span>
      </div>

      {bets.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* desktop table header */}
          <div className="hidden grid-cols-[1fr_0.8fr_0.9fr_0.7fr_1fr_0.9fr] gap-4 px-6 py-3 sm:grid">
            {["Time", "Side", "Bet", "Result", "Payout", "Tx"].map((h) => (
              <span
                key={h}
                className="vf-mono text-[10px] uppercase tracking-[0.14em] text-white/35"
              >
                {h}
              </span>
            ))}
          </div>

          <div className="vf-scrollbar max-h-[420px] overflow-y-auto">
            <AnimatePresence initial={false}>
              {bets.map((bet) => (
                <Row key={bet.id} bet={bet} now={now} />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ bet, now }: { bet: Bet; now: number }) {
  const win = bet.result === "win";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="border-t border-white/[0.05] px-5 py-3.5 transition-colors hover:bg-white/[0.02] sm:px-6"
    >
      {/* desktop */}
      <div className="hidden grid-cols-[1fr_0.8fr_0.9fr_0.7fr_1fr_0.9fr] items-center gap-4 sm:grid">
        <span className="vf-mono text-[12px] text-white/45">
          {relativeTime(bet.timestamp, now)}
        </span>
        <span className="flex items-center gap-2 text-[13px] capitalize text-white/80">
          <Pip side={bet.side} />
          {bet.side}
        </span>
        <span className="vf-mono text-[13px] text-white/80">
          {formatToken(bet.amount)} {CASINO.tokenSymbol}
        </span>
        <span>
          <StatusBadge tone={win ? "success" : "danger"} dot={false}>
            {win ? "Win" : "Loss"}
          </StatusBadge>
        </span>
        <span
          className={cn(
            "vf-mono text-[13px] font-medium",
            win ? "text-success" : "text-white/35",
          )}
        >
          {win ? `+${formatToken(bet.payout)}` : "—"}
        </span>
        <TransactionLink signature={bet.signature} />
      </div>

      {/* mobile */}
      <div className="flex items-center justify-between sm:hidden">
        <div className="flex items-center gap-3">
          <Pip side={bet.side} />
          <div>
            <div className="text-[13px] capitalize text-white/85">
              {bet.side} · {formatToken(bet.amount)} {CASINO.tokenSymbol}
            </div>
            <div className="vf-mono mt-0.5 text-[11px] text-white/40">
              {relativeTime(bet.timestamp, now)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <StatusBadge tone={win ? "success" : "danger"} dot={false}>
            {win ? `+${formatToken(bet.payout)}` : "Loss"}
          </StatusBadge>
          <div className="mt-1">
            <TransactionLink signature={bet.signature} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Pip({ side }: { side: Bet["side"] }) {
  return (
    <span
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
        side === "heads"
          ? "bg-[radial-gradient(circle_at_30%_30%,#4dd0ff,#0c63b8)] text-white"
          : "bg-[radial-gradient(circle_at_30%_30%,#ff9fda,#b00270)] text-white",
      )}
    >
      {side === "heads" ? "V" : "✦"}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 text-white/40">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" strokeLinecap="round" />
        </svg>
      </div>
      <p className="mt-4 font-display text-[15px] font-semibold text-white">
        No flips yet
      </p>
      <p className="mt-1 max-w-[36ch] text-[13px] text-white/45">
        Place your first bet to see it appear here, settled and verifiable on-chain.
      </p>
    </div>
  );
}
