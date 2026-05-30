"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Coin, { COIN_SRC } from "@/components/shared/Coin";
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
  const {
    wallet,
    gamePhase,
    flipStatus,
    lastOutcome,
    flip,
    connect,
    connecting,
    resetGame,
  } = useCasino();
  const [side, setSide] = useState<CoinSide>("heads");
  const [amount, setAmount] = useState("0.01");
  const [error, setError] = useState<string | null>(null);

  const numeric = Number(amount) || 0;
  const pending = gamePhase === "pending";
  const settled = gamePhase === "win" || gamePhase === "lose";
  const potential = payoutFor(numeric);

  // The coin spins continuously while the flip is in flight — through the wallet
  // signature prompt and on-chain confirmation — and only lands once settled.
  const spinning =
    flipStatus === "awaiting_signature" || flipStatus === "confirming";

  const statusLabel =
    flipStatus === "awaiting_signature"
      ? "Waiting for wallet signature…"
      : flipStatus === "confirming"
        ? "Confirming transaction…"
        : flipStatus === "settled"
          ? "Flip settled on-chain"
          : null;

  const tooLow = numeric < CASINO.minBet;
  const tooHigh = numeric > CASINO.maxBet;
  const overBalance = numeric > wallet.casinoBalance;
  const canPlay =
    wallet.connected && !pending && !tooLow && !tooHigh && !overBalance;

  // coin shows the player's pick while playing; the real outcome once settled.
  const facing = settled && lastOutcome ? lastOutcome.outcome : side;

  // Celebrate a win with a confetti burst. canvas-confetti is loaded lazily
  // (dynamic import) so it never weighs on the initial bundle / LCP, and the
  // burst is suppressed when the OS asks to reduce motion. Keyed on the win
  // phase + this specific outcome so it fires exactly once per winning flip.
  const celebrated = useRef<string | null>(null);
  useEffect(() => {
    if (gamePhase !== "win" || !lastOutcome) return;
    const key = lastOutcome.bet.signature;
    if (celebrated.current === key) return;
    celebrated.current = key;

    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let cancelled = false;
    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      const colors = ["#3ddc84", "#4dd0ff", "#ff49b8", "#f80498", "#268df4"];
      const fire = (particleRatio: number, opts: Record<string, unknown>) =>
        confetti({
          origin: { y: 0.45 },
          colors,
          disableForReducedMotion: true,
          particleCount: Math.floor(160 * particleRatio),
          ...opts,
        });
      // layered bursts give a fuller "pop" than a single emit
      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.9 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    });

    return () => {
      cancelled = true;
    };
  }, [gamePhase, lastOutcome]);

  const play = async () => {
    setError(null);
    const res = await flip(side, numeric);
    if (!res.ok) setError(res.error ?? "Something went wrong. Try again.");
  };

  return (
    <div className="vf-card relative overflow-hidden p-5 sm:p-6">
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
      <div className="relative mt-4 flex h-[190px] items-center justify-center sm:h-[220px]">
        <div
          className={cn(
            "rounded-full",
            gamePhase === "win" && "vf-pulse-win",
            gamePhase === "lose" && "vf-pulse-lose",
          )}
        >
          <Coin
            facing={facing}
            spinning={spinning}
            size={172}
            ambient={!spinning}
          />
        </div>

        {/* live flip status near the coin (signature / confirming / settled) */}
        <AnimatePresence>
          {statusLabel && (
            <motion.div
              key={flipStatus}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute top-1 left-1/2 -translate-x-1/2"
            >
              <span
                className={cn(
                  "vf-mono inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px]",
                  spinning
                    ? "border-white/10 bg-white/[0.04] text-white/60"
                    : "border-success/30 bg-success/10 text-success",
                )}
              >
                {spinning && (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                )}
                {statusLabel}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ---- result ----
         A fixed-height slot below the coin reserves the space permanently and
         the label is absolutely positioned inside it, so the card height never
         shifts as the result appears/clears (and it never overlaps the coin). */}
      <div className="relative mt-2 h-[60px]">
        <AnimatePresence>
          {settled && lastOutcome && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              className="absolute inset-x-0 top-0 flex flex-col items-center text-center"
            >
              <div
                className={cn(
                  "font-display text-[26px] font-extrabold tracking-tight sm:text-[28px]",
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
      <div className="mt-4 grid grid-cols-2 gap-3">
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
              "group relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all disabled:cursor-not-allowed",
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={COIN_SRC[s]}
              alt=""
              aria-hidden
              draggable={false}
              className="absolute right-3 top-3 h-8 w-8 select-none object-contain drop-shadow-[0_3px_8px_rgba(0,0,0,0.5)]"
            />
          </button>
        ))}
      </div>

      {/* ---- amount ---- */}
      <div className="mt-4">
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
      <div className="mt-4 grid grid-cols-2 gap-3">
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
      <div className="mt-4">
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
