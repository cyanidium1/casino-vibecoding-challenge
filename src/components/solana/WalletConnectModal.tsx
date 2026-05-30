"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet, type Wallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import Modal from "@/components/modals/Modal";
import { ArrowUpRight } from "@/components/shared/icons";
import { notifyInfo } from "@/lib/notifications";

const PHANTOM = "Phantom";
const PHANTOM_URL = "https://phantom.app/download";

/**
 * Wallets we explicitly support, in picker priority order. All three implement
 * the Wallet Standard, so they self-register into wallet-adapter's `wallets`
 * list when their browser extension is installed — no per-wallet adapter
 * packages are needed (the empty `wallets` array in SolanaProvider already
 * yields this multi-wallet setup).
 *
 * `mobile(url, ref)` builds the wallet's universal "browse" link. On a phone a
 * plain browser never injects a wallet provider, so tapping the link hands off
 * to the wallet's own in-app browser (where the provider IS injected) and loads
 * VibeFlip there — the only way to connect on Android + iOS. All three share
 * the same `…/browse/<encoded-url>?ref=<encoded-ref>` shape.
 */
const SUPPORTED_WALLETS = [
  {
    name: "Phantom",
    mobile: (url: string, ref: string) =>
      `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(ref)}`,
  },
  {
    name: "Solflare",
    mobile: (url: string, ref: string) =>
      `https://solflare.com/ul/v1/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(ref)}`,
  },
  {
    name: "Backpack",
    mobile: (url: string, ref: string) =>
      `https://backpack.app/ul/v1/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(ref)}`,
  },
] as const;

const PRIORITY: readonly string[] = SUPPORTED_WALLETS.map((w) => w.name);
/** Lower rank sorts first; unknown wallets fall to the end. */
const rankOf = (name: string) => {
  const i = PRIORITY.indexOf(name);
  return i === -1 ? PRIORITY.length : i;
};

interface WalletConnectModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Custom wallet picker that replaces the default wallet-adapter modal: lists
 * installed Wallet-Standard wallets (Phantom → Solflare → Backpack → others),
 * gives a mobile "open in wallet" deep-link path or a desktop install path when
 * none is detected, locks background scroll (via <Modal>), and opens the wallet
 * popup directly on select (autoConnect is enabled).
 */
export default function WalletConnectModal({ open, onClose }: WalletConnectModalProps) {
  const { wallets, select, connected, connecting } = useWallet();

  // Detect a phone (client-only, after mount → no hydration mismatch). On
  // mobile we can't inject an extension, so the "no wallet" path offers a
  // deep-link into each wallet's in-app browser instead of a desktop install.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
  }, []);

  // Installed (Wallet-Standard) wallets, ordered by our supported priority.
  const installed = useMemo(
    () =>
      wallets
        .filter((w) => w.readyState === WalletReadyState.Installed)
        .sort((a, b) => rankOf(a.adapter.name) - rankOf(b.adapter.name)),
    [wallets],
  );

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

  const openInWallet = (build: (url: string, ref: string) => string) => {
    window.location.href = build(window.location.href, window.location.origin);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connect a wallet"
      subtitle="Phantom, Solflare or Backpack on Solana Devnet. No real funds required."
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
        ) : isMobile ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[13px] leading-relaxed text-white/70">
                On mobile, open VibeFlip inside your wallet&apos;s built-in
                browser to connect. Make sure the wallet is switched to{" "}
                <span className="text-white">Devnet</span>.
              </p>
            </div>
            {SUPPORTED_WALLETS.map((w) => (
              <button
                key={w.name}
                type="button"
                onClick={() => openInWallet(w.mobile)}
                className="group flex items-center justify-between rounded-2xl border border-main/30 bg-main/[0.08] px-4 py-3.5 transition-colors hover:bg-main/[0.14]"
              >
                <span className="font-display text-[15px] font-semibold text-white">
                  Open in {w.name}
                </span>
                <ArrowUpRight className="h-4 w-4 text-main-light transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[13px] leading-relaxed text-white/70">
                No Solana wallet detected. Install{" "}
                <span className="text-white">Phantom</span>,{" "}
                <span className="text-white">Solflare</span> or{" "}
                <span className="text-white">Backpack</span>, enable{" "}
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

        <p className="mt-1 text-center vf-mono text-[10px] uppercase tracking-[0.14em] text-white/35">
          Devnet · testnet tokens only
        </p>
      </div>
    </Modal>
  );
}
