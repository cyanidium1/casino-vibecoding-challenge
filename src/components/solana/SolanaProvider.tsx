"use client";

import "@/lib/solana/polyfill";
import { useCallback, useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { clusterApiUrl } from "@solana/web3.js";
import type { WalletError } from "@solana/wallet-adapter-base";
import { notifyError } from "@/lib/notifications";

export function SolanaProvider({ children }: { children: ReactNode }) {
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl("devnet"),
    [],
  );
  // Phantom, Solflare, Backpack (and any other Wallet-Standard wallet) all
  // self-register via the Wallet Standard, so the explicit adapter list stays
  // empty — every installed standard wallet shows up in the picker with no
  // per-wallet adapter package. The picker (WalletConnectModal) orders them
  // Phantom → Solflare → Backpack.
  const wallets = useMemo(() => [], []);

  // Surfaces connection failures + user-rejected connect prompts as toasts.
  const onError = useCallback((error: WalletError) => {
    notifyError(error, "connect");
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect onError={onError}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
