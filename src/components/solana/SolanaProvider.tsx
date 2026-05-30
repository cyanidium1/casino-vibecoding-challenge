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
  // Phantom (and other Wallet-Standard wallets) self-register, so the explicit
  // adapter list can stay empty.
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
