"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Coin from "@/components/shared/Coin";
import MainButton from "@/components/shared/buttons/MainButton";
import AmountInput from "@/components/shared/AmountInput";
import StatusBadge from "@/components/shared/StatusBadge";
import TransactionLink from "@/components/shared/TransactionLink";
import { WalletIcon } from "@/components/shared/icons";
import { useCasino } from "@/context/CasinoProvider";
import { CASINO, payoutFor } from "@/lib/config";
import { formatToken } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { CoinSide } from "@/types";

export default function CoinFlipGame() {
  const { wallet, gamePhase, lastOutcome, flip, connect, connecting, resetGame } =
    useCasino();
  const [side, setSide] = useState<CoinSide>("heads");
  const [amount, setAmount] = useState("5");
  const [error, setError] = useState<string | null>(null);

  const numeric = Number(amount) || 0;
  const pending = gamePhase === "pending";
  const settled = gamePhase === "win" || gamePhase === "lose";
  const potential = payoutFor(numeric);

  const tooLow = numeric < CASINO.minBet;
  const tooHigh = numeric > CASINO.maxBet;
  const overBalance = numeric > wallet.casinoBalance;
  const canPlay =
    wallet.connected && !pending && !tooLow && !tooHigh && !overBalance;

  // coin shows the player's pick while playing; the real outcome once settled.
  const facing = settled && lastOutcome ? lastOutcome.outcome : side;

  const play = async () => {
    setError(null);
    const res = await flip(side, numeric);
    if (!res.ok) setError(res.error ?? "Something went wrong. Try again.");
  };

  return (
    <div className="vf-card relative overflow-hidden p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-[18px] font-bold tracking-tight text-white">
            Coin Flip
          </span>
          <StatusBadge tone="live">Live</StatusBadge>
        </div>
        <span className="vf-mono text-[11px] text-white/40">
          {CASINO.edge * 100}% edge · 2× payout
        </span>
      </div>

      {/* ---- coin stage ---- */}
      <div className="relative mt-6 flex h-[260px] items-center justify-center sm:h-[300px]">
        <div
          className={cn(
            "rounded-full",
            gamePhase === "win" && "vf-pulse-win",
            gamePhase === "lose" && "vf-pulse-lose",
          )}
        >
          <Coin facing={facing} spinning={pending} size={210} ambient={gamePhase === "idle"} />
        </div>

        <AnimatePresence>
          {settled && lastOutcome && (
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-center"
            >
              <div
                className={cn(
                  "font-display text-[28px] font-extrabold tracking-tight",
                  gamePhase === "win" ? "text-success" : "text-danger",
                )}
              >
                {gamePhase === "win" ? "You won" : "You lost"}
              </div>
              <div className="vf-mono mt-0.5 text-[12px] text-white/50">
                Landed on {lastOutcome.outcome}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---- side selector ---- */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {(["heads", "tails"] as const).map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => {
              setSide(s);
              if (settled) resetGame();
            }}
            className={cn(
              "group relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all disabled:cursor-not-allowed",
              side === s
                ? s === "heads"
                  ? "border-blue/60 bg-blue/10"
                  : "border-main/60 bg-main/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20",
            )}
          >
            <span
              className={cn(
                "vf-mono text-[10px] uppercase tracking-[0.16em]",
                side === s ? "text-white/60" : "text-white/35",
              )}
            >
              Bet on
            </span>
            <span
              className={cn(
                "mt-1 block font-display text-[20px] font-bold capitalize",
                side === s
                  ? s === "heads"
                    ? "text-blue-bright"
                    : "text-main-light"
                  : "text-white/70",
              )}
            >
              {s}
            </span>
            <span
              className={cn(
                "absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold",
                s === "heads"
                  ? "bg-[radial-gradient(circle_at_30%_30%,#4dd0ff,#0c63b8)] text-white"
                  : "bg-[radial-gradient(circle_at_30%_30%,#ff9fda,#b00270)] text-white",
              )}
            >
              {s === "heads" ? "V" : "✦"}
            </span>
          </button>
        ))}
      </div>

      {/* ---- amount ---- */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="vf-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
            Bet amount
          </span>
          {wallet.connected && (
            <span className="vf-mono text-[11px] text-white/35">
              Balance: {formatToken(wallet.casinoBalance)} {CASINO.tokenSymbol}
            </span>
          )}
        </div>
        <AmountInput
          value={amount}
          onChange={(v) => {
            setAmount(v);
            setError(null);
            if (settled) resetGame();
          }}
          max={wallet.connected ? wallet.casinoBalance : undefined}
          disabled={pending}
        />
      </div>

      {/* ---- payout summary ---- */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
          <div className="vf-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
            Potential payout
          </div>
          <div className="mt-1.5 font-display text-[20px] font-bold tracking-tight vf-grad-blue">
            {formatToken(potential)}{" "}
            <span className="vf-mono text-[12px] text-white/40">
              {CASINO.tokenSymbol}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
          <div className="vf-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
            On win you net
          </div>
          <div className="mt-1.5 font-display text-[20px] font-bold tracking-tight text-success">
            +{formatToken(potential - numeric)}{" "}
            <span className="vf-mono text-[12px] text-white/40">
              {CASINO.tokenSymbol}
            </span>
          </div>
        </div>
      </div>

      {/* ---- validation / errors ---- */}
      {wallet.connected && (tooLow || tooHigh || overBalance) && (
        <p className="mt-3 text-[12px] text-danger">
          {overBalance
            ? "Bet exceeds your casino balance — deposit more SOL."
            : tooLow
              ? `Minimum bet is ${CASINO.minBet} ${CASINO.tokenSymbol}.`
              : `Maximum bet is ${CASINO.maxBet} ${CASINO.tokenSymbol}.`}
        </p>
      )}
      {error && <p className="mt-3 text-[12px] text-danger">{error}</p>}

      {/* ---- action ---- */}
      <div className="mt-5">
        {!wallet.connected ? (
          <MainButton
            fullWidth
            size="lg"
            onClick={connect}
            isLoading={connecting}
            leftIcon={<WalletIcon className="h-[18px] w-[18px]" />}
          >
            Connect Wallet to Play
          </MainButton>
        ) : settled ? (
          <MainButton fullWidth size="lg" variant="primary" onClick={resetGame}>
            Flip Again
          </MainButton>
        ) : (
          <MainButton
            fullWidth
            size="lg"
            variant="primary"
            onClick={play}
            isLoading={pending}
            disabled={!canPlay}
          >
            {pending ? "Flipping…" : `Flip for ${formatToken(numeric)} ${CASINO.tokenSymbol}`}
          </MainButton>
        )}
      </div>

      {settled && lastOutcome && (
        <div className="mt-3 flex justify-center">
          <TransactionLink
            signature={lastOutcome.bet.signature}
            label="Verify this flip on Solana Explorer"
          />
        </div>
      )}
    </div>
  );
}
