import type { WalletState } from "@/types";

export const DISCONNECTED_WALLET: WalletState = {
  connected: false,
  address: null,
  walletBalance: 0,
  casinoBalance: 0,
};

/** The state we drop into after a simulated wallet connect. */
export const CONNECTED_WALLET: WalletState = {
  connected: true,
  address: "7yQ2mDvN8kF3pLxR4tWbH9aScZ6eUgJ1nQ5oPkTfVbA",
  walletBalance: 12.482,
  casinoBalance: 50,
};
