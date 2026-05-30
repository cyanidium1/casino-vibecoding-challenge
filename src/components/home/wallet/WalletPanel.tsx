"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import MainButton from "@/components/shared/buttons/MainButton";
import StatusBadge from "@/components/shared/StatusBadge";
import DepositModal from "@/components/modals/DepositModal";
import WithdrawModal from "@/components/modals/WithdrawModal";
import {
  WalletIcon,
  PlusIcon,
  MinusIcon,
  CopyIcon,
  CheckIcon,
  CoinsIcon,
} from "@/components/shared/icons";
import { useCasino } from "@/context/CasinoProvider";
import { shortenAddress, formatToken } from "@/lib/utils/format";
import { CASINO } from "@/lib/config";

export default function WalletPanel() {
  const { wallet, connecting, connect, disconnect } = useCasino();
  const [deposit, setDeposit] = useState(false);
  const [withdraw, setWithdraw] = useState(false);
  const [copied, setCopied] = useState(false);
  // Track the reset timer so we can clear it on unmount / re-copy (no leak, no
  // setState-after-unmount).
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const copy = async () => {
    if (!wallet.address) return;
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can reject (denied permission / insecure context). Non-fatal —
      // just skip the "copied" confirmation rather than throwing unhandled.
    }
  };

  return (
    <motion.aside
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="vf-card p-6"
    >
      <div className="flex items-center justify-between">
        <span className="vf-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
          Wallet
        </span>
        <StatusBadge tone={wallet.connected ? "live" : "neutral"}>
          {wallet.connected ? "Connected" : "Disconnected"}
        </StatusBadge>
      </div>

      {!wallet.connected ? (
        // ---- disconnected (empty) state ----
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-main/12 text-main-light">
            <WalletIcon className="h-7 w-7" />
          </div>
          <p className="mt-4 font-display text-[16px] font-semibold text-white">
            No wallet connected
          </p>
          <p className="mt-1 max-w-[34ch] text-[13px] text-white/45">
            Connect a {CASINO.network} wallet to deposit {CASINO.tokenSymbol} and
            start flipping.
          </p>
          <MainButton
            className="mt-5"
            fullWidth
            onClick={connect}
            isLoading={connecting}
            leftIcon={<WalletIcon className="h-[18px] w-[18px]" />}
          >
            Connect Wallet
          </MainButton>
        </div>
      ) : (
        // ---- connected state ----
        <div className="mt-5 flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0899FC,#FF49B8)] text-[13px] font-bold text-white">
                {wallet.address?.slice(0, 2)}
              </div>
              <div>
                <div className="vf-mono text-[13px] text-white">
                  {shortenAddress(wallet.address ?? "", 4)}
                </div>
                <StatusBadge tone="main" className="mt-1 !px-2 !py-0.5 !text-[10px]">
                  {CASINO.network}
                </StatusBadge>
              </div>
            </div>
            <button
              onClick={copy}
              aria-label="Copy address"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {copied ? (
                <CheckIcon className="h-4 w-4 text-success" />
              ) : (
                <CopyIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <BalanceTile
              label="Wallet"
              value={`${formatToken(wallet.walletBalance, 3)}`}
              unit="SOL"
              icon={<WalletIcon className="h-4 w-4" />}
            />
            <BalanceTile
              label="Casino"
              value={formatToken(wallet.casinoBalance)}
              unit={CASINO.tokenSymbol}
              accent
              icon={<CoinsIcon className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MainButton
              variant="primary"
              onClick={() => setDeposit(true)}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Deposit
            </MainButton>
            <MainButton
              variant="ghost"
              onClick={() => setWithdraw(true)}
              disabled={wallet.casinoBalance <= 0}
              leftIcon={<MinusIcon className="h-4 w-4" />}
            >
              Withdraw
            </MainButton>
          </div>

          <button
            onClick={disconnect}
            className="vf-mono mt-1 self-center text-[11px] uppercase tracking-[0.12em] text-white/35 transition-colors hover:text-danger"
          >
            Disconnect
          </button>
        </div>
      )}

      <DepositModal open={deposit} onClose={() => setDeposit(false)} />
      <WithdrawModal open={withdraw} onClose={() => setWithdraw(false)} />
    </motion.aside>
  );
}

function BalanceTile({
  label,
  value,
  unit,
  icon,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-white/40">
        <span className={accent ? "text-main-light" : ""}>{icon}</span>
        <span className="vf-mono text-[10px] uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-display text-[22px] font-bold leading-none tracking-tight text-white">
          {value}
        </span>
        <span className="vf-mono text-[11px] text-white/40">{unit}</span>
      </div>
    </div>
  );
}
