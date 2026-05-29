"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Modal from "@/components/modals/Modal";
import MainButton from "@/components/shared/buttons/MainButton";
import AmountInput from "@/components/shared/AmountInput";
import TransactionLink from "@/components/shared/TransactionLink";
import { CheckIcon } from "@/components/shared/icons";
import { useCasino } from "@/context/CasinoProvider";
import { CASINO } from "@/lib/config";
import { formatToken } from "@/lib/utils/format";

type Mode = "deposit" | "withdraw";

interface TransferModalProps {
  mode: Mode;
  open: boolean;
  onClose: () => void;
}

const COPY: Record<Mode, { title: string; subtitle: string; cta: string }> = {
  deposit: {
    title: "Deposit VIBE",
    subtitle: "Move tokens from your wallet into the casino vault.",
    cta: "Deposit",
  },
  withdraw: {
    title: "Withdraw VIBE",
    subtitle: "Move tokens from the casino vault back to your wallet.",
    cta: "Withdraw",
  },
};

export default function TransferModal({ mode, open, onClose }: TransferModalProps) {
  const { wallet, deposit, withdraw } = useCasino();
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const source = mode === "deposit" ? wallet.walletBalance : wallet.casinoBalance;
  const numeric = Number(amount) || 0;
  const overBalance = numeric > source;
  const invalid = numeric <= 0 || overBalance;
  const copy = COPY[mode];

  const reset = () => {
    setAmount("");
    setError(null);
    setSignature(null);
    setPending(false);
  };

  const handleClose = () => {
    if (pending) return;
    reset();
    onClose();
  };

  const submit = async () => {
    setError(null);
    setPending(true);
    const action = mode === "deposit" ? deposit : withdraw;
    const res = await action(numeric);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Transaction failed. Please try again.");
      return;
    }
    // Surface a fresh signature from the most recent matching transaction.
    setSignature("done");
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={copy.title}
      subtitle={copy.subtitle}
    >
      <AnimatePresence mode="wait">
        {signature ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center"
          >
            <div className="vf-pulse-win flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckIcon className="h-8 w-8" />
            </div>
            <p className="mt-4 font-display text-[18px] font-bold text-white">
              {copy.cta} confirmed
            </p>
            <p className="mt-1 text-[13px] text-white/55">
              {formatToken(numeric)} {CASINO.tokenSymbol}{" "}
              {mode === "deposit" ? "added to your vault." : "sent to your wallet."}
            </p>
            <div className="mt-4">
              <LastSignature />
            </div>
            <MainButton
              className="mt-6"
              fullWidth
              variant="ghost"
              onClick={handleClose}
            >
              Done
            </MainButton>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-5"
          >
            <AmountInput
              value={amount}
              onChange={(v) => {
                setAmount(v);
                setError(null);
              }}
              max={source}
              disabled={pending}
              autoFocus
            />

            {overBalance && (
              <p className="text-[12px] text-danger">
                Amount exceeds your available{" "}
                {mode === "deposit" ? "wallet" : "casino"} balance.
              </p>
            )}
            {error && <p className="text-[12px] text-danger">{error}</p>}

            <MainButton
              fullWidth
              size="lg"
              variant={mode === "deposit" ? "primary" : "blue"}
              isLoading={pending}
              disabled={invalid}
              onClick={submit}
            >
              {pending ? "Confirming…" : copy.cta}
            </MainButton>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

/** Reads the freshest transaction from context so the explorer link is real. */
function LastSignature() {
  const { transactions } = useCasino();
  const latest = transactions[0];
  if (!latest) return null;
  return <TransactionLink signature={latest.signature} label="View on Solana Explorer" />;
}
