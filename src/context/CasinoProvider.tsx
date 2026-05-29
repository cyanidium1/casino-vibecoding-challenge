"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Bet,
  CoinSide,
  FlipOutcome,
  GamePhase,
  Transaction,
  WalletState,
} from "@/types";
import { DISCONNECTED_WALLET } from "@/lib/mock/mockWallet";
import { seedBets } from "@/lib/mock/mockBets";
import { seedTransactions } from "@/lib/mock/mockTransactions";
import { fakeSignature } from "@/lib/mock/signatures";
import * as service from "@/lib/services/casino";

interface CasinoContextValue {
  wallet: WalletState;
  bets: Bet[];
  transactions: Transaction[];
  connecting: boolean;
  gamePhase: GamePhase;
  lastOutcome: FlipOutcome | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  deposit: (amount: number) => Promise<{ ok: boolean; error?: string }>;
  withdraw: (amount: number) => Promise<{ ok: boolean; error?: string }>;
  flip: (side: CoinSide, amount: number) => Promise<{ ok: boolean; error?: string }>;
  resetGame: () => void;
}

const CasinoContext = createContext<CasinoContextValue | null>(null);

export function CasinoProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(DISCONNECTED_WALLET);
  const [bets, setBets] = useState<Bet[]>(() => seedBets());
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    seedTransactions(),
  );
  const [connecting, setConnecting] = useState(false);
  const [gamePhase, setGamePhase] = useState<GamePhase>("idle");
  const [lastOutcome, setLastOutcome] = useState<FlipOutcome | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    const res = await service.connectWallet();
    if (res.ok && res.data) setWallet(res.data);
    setConnecting(false);
  }, []);

  const disconnect = useCallback(async () => {
    await service.disconnectWallet();
    setWallet(DISCONNECTED_WALLET);
    setGamePhase("idle");
    setLastOutcome(null);
  }, []);

  const recordTx = useCallback((tx: Transaction) => {
    setTransactions((prev) => [tx, ...prev]);
  }, []);

  const deposit = useCallback(
    async (amount: number) => {
      const res = await service.depositTokens(amount);
      if (!res.ok || !res.data) return { ok: false, error: res.error };
      setWallet((w) => ({
        ...w,
        walletBalance: Math.max(0, w.walletBalance - amount),
        casinoBalance: w.casinoBalance + amount,
      }));
      recordTx({
        id: `tx-${Date.now()}`,
        type: "deposit",
        amount,
        timestamp: Date.now(),
        signature: res.data.signature,
        status: "confirmed",
      });
      return { ok: true };
    },
    [recordTx],
  );

  const withdraw = useCallback(
    async (amount: number) => {
      const res = await service.withdrawTokens(amount);
      if (!res.ok || !res.data) return { ok: false, error: res.error };
      setWallet((w) => ({
        ...w,
        walletBalance: w.walletBalance + amount,
        casinoBalance: Math.max(0, w.casinoBalance - amount),
      }));
      recordTx({
        id: `tx-${Date.now()}`,
        type: "withdraw",
        amount,
        timestamp: Date.now(),
        signature: res.data.signature,
        status: "confirmed",
      });
      return { ok: true };
    },
    [recordTx],
  );

  const flip = useCallback(
    async (side: CoinSide, amount: number) => {
      if (amount > wallet.casinoBalance) {
        return { ok: false, error: "Insufficient casino balance. Deposit more VIBE." };
      }
      setGamePhase("pending");
      setLastOutcome(null);

      const res = await service.placeBet(side, amount);
      if (!res.ok || !res.data) {
        setGamePhase("idle");
        return { ok: false, error: res.error };
      }

      const { result, payout, bet } = res.data;
      const net = payout - amount; // payout already excludes stake (0 on loss)
      setWallet((w) => ({ ...w, casinoBalance: w.casinoBalance + net }));
      setBets((prev) => [bet, ...prev]);
      recordTx({
        id: `tx-${bet.id}`,
        type: "bet",
        amount,
        timestamp: bet.timestamp,
        signature: bet.signature,
        status: "confirmed",
      });
      if (result === "win") {
        recordTx({
          id: `tx-payout-${bet.id}`,
          type: "payout",
          amount: payout,
          timestamp: bet.timestamp,
          signature: fakeSignature(),
          status: "confirmed",
        });
      }
      setLastOutcome(res.data);
      setGamePhase(result);
      return { ok: true };
    },
    [recordTx, wallet.casinoBalance],
  );

  const resetGame = useCallback(() => {
    setGamePhase("idle");
    setLastOutcome(null);
  }, []);

  const value = useMemo<CasinoContextValue>(
    () => ({
      wallet,
      bets,
      transactions,
      connecting,
      gamePhase,
      lastOutcome,
      connect,
      disconnect,
      deposit,
      withdraw,
      flip,
      resetGame,
    }),
    [
      wallet,
      bets,
      transactions,
      connecting,
      gamePhase,
      lastOutcome,
      connect,
      disconnect,
      deposit,
      withdraw,
      flip,
      resetGame,
    ],
  );

  return <CasinoContext.Provider value={value}>{children}</CasinoContext.Provider>;
}

export function useCasino(): CasinoContextValue {
  const ctx = useContext(CasinoContext);
  if (!ctx) throw new Error("useCasino must be used within a CasinoProvider");
  return ctx;
}
