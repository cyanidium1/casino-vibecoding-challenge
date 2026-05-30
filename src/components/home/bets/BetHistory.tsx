"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import StatusBadge from "@/components/shared/StatusBadge";
import TransactionLink from "@/components/shared/TransactionLink";
import { COIN_SRC } from "@/components/shared/Coin";
import { RefreshIcon, Spinner } from "@/components/shared/icons";
import { useCasino } from "@/context/CasinoProvider";
import { relativeTime, formatToken, shortenAddress } from "@/lib/utils/format";
import { CASINO } from "@/lib/config";
import { cn } from "@/lib/utils/cn";
import type { Bet } from "@/types";

const GRID =
  "grid-cols-[0.8fr_0.9fr_0.7fr_0.8fr_0.7fr_1fr_0.7fr]";

export default function BetHistory() {
  const { bets, historyLoading, historyError, refreshHistory, wallet } =
    useCasino();
  const [now, setNow] = useState(() => Date.now());

  // keep relative timestamps fresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const initialLoading = historyLoading && bets.length === 0;
  // Only show the failure fallback when we have nothing to display — if cached
  // flips exist we keep them and a retry is a click away in the header.
  const showError = historyError && !historyLoading && bets.length === 0;

  return (
    <div className="vf-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-[16px] font-bold tracking-tight text-white">
            Recent Flips
          </span>
          <StatusBadge tone="live">On-chain feed</StatusBadge>
        </div>
        <div className="flex items-center gap-3">
          <span className="vf-mono text-[11px] text-white/35">
            {bets.length} flips
          </span>
          <button
            type="button"
            onClick={() => void refreshHistory()}
            disabled={historyLoading}
            aria-label="Refresh history"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/55 transition-colors hover:border-main/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {historyLoading ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <RefreshIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {initialLoading ? (
        <LoadingState />
      ) : showError ? (
        <ErrorState onRetry={() => void refreshHistory()} />
      ) : bets.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* desktop table header */}
          <div className={cn("hidden gap-4 px-6 py-3 sm:grid", GRID)}>
            {["Time", "Player", "Side", "Bet", "Result", "Payout", "Tx"].map(
              (h) => (
                <span
                  key={h}
                  className="vf-mono text-[10px] uppercase tracking-[0.14em] text-white/35"
                >
                  {h}
                </span>
              ),
            )}
          </div>

          <div className="vf-scrollbar max-h-[440px] overflow-y-auto">
            <AnimatePresence initial={false}>
              {bets.map((bet) => (
                <Row
                  key={bet.signature || bet.id}
                  bet={bet}
                  now={now}
                  you={!!wallet.address && bet.player === wallet.address}
                />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ bet, now, you }: { bet: Bet; now: number; you: boolean }) {
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
      <div className={cn("hidden items-center gap-4 sm:grid", GRID)}>
        <span className="vf-mono text-[12px] text-white/45">
          {relativeTime(bet.timestamp, now)}
        </span>
        <span className="vf-mono text-[12px] text-white/55">
          {bet.player ? (
            you ? (
              <span className="text-main-light">You</span>
            ) : (
              shortenAddress(bet.player, 4)
            )
          ) : (
            "—"
          )}
        </span>
        <span className="flex items-center gap-2 text-[13px] capitalize text-white/80">
          <Pip side={bet.side} />
          {bet.side}
        </span>
        <span className="vf-mono text-[13px] text-white/80">
          {formatToken(bet.amount, 3)} {CASINO.tokenSymbol}
        </span>
        <span>
          <StatusBadge tone={win ? "success" : "danger"} dot={false}>
            {win ? "Win" : "Loss"}
          </StatusBadge>
        </span>
        <span className="flex flex-col">
          <span
            className={cn(
              "vf-mono text-[13px] font-medium",
              win ? "text-success" : "text-white/35",
            )}
          >
            {win ? `+${formatToken(bet.payout, 3)}` : "—"}
          </span>
          {bet.newBalance !== undefined && (
            <span className="vf-mono text-[10px] text-white/30">
              bal {formatToken(bet.newBalance, 3)}
            </span>
          )}
        </span>
        <TransactionLink signature={bet.signature} />
      </div>

      {/* mobile */}
      <div className="flex items-center justify-between sm:hidden">
        <div className="flex items-center gap-3">
          <Pip side={bet.side} />
          <div>
            <div className="text-[13px] capitalize text-white/85">
              {bet.side} · {formatToken(bet.amount, 3)} {CASINO.tokenSymbol}
            </div>
            <div className="vf-mono mt-0.5 flex items-center gap-1.5 text-[11px] text-white/40">
              <span>{relativeTime(bet.timestamp, now)}</span>
              {bet.player && (
                <>
                  <span className="text-white/20">·</span>
                  <span>{you ? "You" : shortenAddress(bet.player, 4)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <StatusBadge tone={win ? "success" : "danger"} dot={false}>
            {win ? `+${formatToken(bet.payout, 3)}` : "Loss"}
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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={COIN_SRC[side]}
      alt={side}
      draggable={false}
      className="h-7 w-7 select-none object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
    />
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-3 px-5 py-6 sm:px-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-white/[0.04] bg-white/[0.015] px-4 py-3.5"
        >
          <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-2.5 w-1/4 animate-pulse rounded bg-white/[0.04]" />
          </div>
          <div className="h-5 w-16 animate-pulse rounded-full bg-white/[0.06]" />
        </div>
      ))}
      <p className="mt-1 text-center vf-mono text-[11px] text-white/35">
        Loading public on-chain flips…
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 text-danger">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" strokeLinecap="round" />
          <path d="M12 16h.01" strokeLinecap="round" />
        </svg>
      </div>
      <p className="mt-4 font-display text-[15px] font-semibold text-white">
        Couldn&apos;t load the on-chain feed
      </p>
      <p className="mt-1 max-w-[38ch] text-[13px] text-white/45">
        The public Devnet RPC may be rate-limiting requests. Your flips are still
        settled on-chain — try again in a moment.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 vf-mono text-[12px] uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-main/50 hover:text-white"
      >
        <RefreshIcon className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
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
