"use client";

import TransferModal from "@/components/modals/TransferModal";

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
}

export default function WithdrawModal({ open, onClose }: WithdrawModalProps) {
  return <TransferModal mode="withdraw" open={open} onClose={onClose} />;
}
