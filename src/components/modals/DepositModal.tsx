"use client";

import TransferModal from "@/components/modals/TransferModal";

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DepositModal({ open, onClose }: DepositModalProps) {
  return <TransferModal mode="deposit" open={open} onClose={onClose} />;
}
