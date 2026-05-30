"use client";

import { useEffect, useMemo } from "react";
import { useWallet, type Wallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import Modal from "@/components/modals/Modal";
import { ArrowUpRight } from "@/components/shared/icons";
import { notifyInfo } from "@/lib/notifications";

const PHANTOM = "Phantom";
const PHANTOM_URL = "https://phantom.app/download";

interface WalletConnectModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Custom wallet picker that replaces the default wallet-adapter modal:
 * clearly lists installed wallets (Phantom first), gives an Install-Phantom
 * path when none is detected, locks background scroll (via <Modal>), and
 * opens the wallet popup directly on select (autoConnect is enabled).
 */
export default function WalletConnectModal({ open, onClose }: WalletConnectModalProps) {
  const { wallets, select, connected, connecting } = useWallet();

  // Installed (Wallet-Standard) wallets, with Phantom pinned to the top.
  const installed = useMemo(
    () =>
      wallets
        .filter((w) => w.readyState === WalletReadyState.Installed)
        .sort((a, b) =>
          a.adapter.name === PHANTOM ? -1 : b.adapter.name === PHANTOM ? 1 : 0,
        ),
    [wallets],
  );
  const phantomInstalled = installed.some((w) => w.adapter.name === PHANTOM);

  // A successful connection closes the picker.
  useEffect(() => {
    if (open && connected) onClose();
  }, [open, connected, onClose]);

  const choose = (w: Wallet) => {
    notifyInfo(`Connecting to ${w.adapter.name}…`, {
      description: "Approve the request in your wallet.",
    });
    // select() + autoConnect triggers the wallet popup directly.
    select(w.adapter.name);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connect a wallet"
      subtitle="Use Phantom on Solana Devnet. No real funds required."
    >
      <div className="flex flex-col gap-3">
        {installed.length > 0 ? (
          installed.map((w) => (
            <button
              key={w.adapter.name}
              type="button"
              onClick={() => choose(w)}
              disabled={connecting}
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 transition-colors hover:border-main/50 hover:bg-main/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex items-center gap-3">
                {/* wallet icons are wallet-provided data URIs */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={w.adapter.icon}
                  alt=""
                  className="h-7 w-7 rounded-md"
                  aria-hidden
                />
                <span className="font-display text-[15px] font-semibold text-white">
                  {w.adapter.name}
                  {w.adapter.name === PHANTOM && (
                    <span className="ml-2 align-middle vf-mono text-[9px] uppercase tracking-[0.14em] text-main-light">
                      Recommended
                    </span>
                  )}
                </span>
              </span>
              <span className="vf-mono text-[11px] uppercase tracking-[0.14em] text-main-light">
                {connecting ? "Connecting…" : "Connect"}
              </span>
            </button>
          ))
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[13px] leading-relaxed text-white/70">
                No Solana wallet detected. Install{" "}
                <span className="text-white">Phantom</span>, enable{" "}
                <span className="text-white">Devnet</span>, then refresh this
                page.
              </p>
            </div>
            <a
              href={PHANTOM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-2xl border border-main/30 bg-main/[0.08] px-4 py-3.5 transition-colors hover:bg-main/[0.14]"
            >
              <span className="font-display text-[15px] font-semibold text-white">
                Install Phantom
              </span>
              <ArrowUpRight className="h-4 w-4 text-main-light transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        )}

        {installed.length > 0 && !phantomInstalled && (
          <a
            href={PHANTOM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center justify-center gap-1 self-center vf-mono text-[11px] text-white/45 transition-colors hover:text-main-light"
          >
            Don&apos;t have Phantom? Install it
            <ArrowUpRight className="h-3 w-3" />
          </a>
        )}

        <p className="mt-1 text-center vf-mono text-[10px] uppercase tracking-[0.14em] text-white/35">
          Devnet · testnet tokens only
        </p>
      </div>
    </Modal>
  );
}
