"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BN } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import type {
  Bet,
  BetResult,
  CoinSide,
  FlipOutcome,
  GamePhase,
  Transaction,
  WalletState,
} from "@/types";
import { useProgram, vaultPda, playerPda } from "@/lib/solana/program";
import { payoutFor } from "@/lib/config";

const DISCONNECTED: WalletState = {
  connected: false,
  address: null,
  walletBalance: 0,
  casinoBalance: 0,
};

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

const toLamports = (sol: number) => new BN(Math.round(sol * LAMPORTS_PER_SOL));

function parseErr(e: unknown): string {
  if (e && typeof e === "object") {
    const anyE = e as { error?: { errorMessage?: string }; message?: string };
    if (anyE.error?.errorMessage) return anyE.error.errorMessage;
    if (typeof anyE.message === "string") return anyE.message;
  }
  return "Transaction failed. Please try again.";
}

export function CasinoProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const { publicKey, connecting, disconnect: disconnectWallet } = useWallet();
  const { setVisible } = useWalletModal();
  const program = useProgram();

  const [wallet, setWallet] = useState<WalletState>(DISCONNECTED);
  const [bets, setBets] = useState<Bet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>("idle");
  const [lastOutcome, setLastOutcome] = useState<FlipOutcome | null>(null);

  const recordTx = useCallback((tx: Transaction) => {
    setTransactions((prev) => [tx, ...prev]);
  }, []);

  /** Pull fresh wallet SOL + on-chain ledger balance from the cluster. */
  const refresh = useCallback(async () => {
    if (!publicKey) {
      setWallet(DISCONNECTED);
      return;
    }
    const lamports = await connection.getBalance(publicKey);
    let casino = 0;
    if (program) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ps = await (program.account as any).playerState.fetch(
          playerPda(publicKey),
        );
        casino = ps.balance.toNumber() / LAMPORTS_PER_SOL;
      } catch {
        casino = 0; // ledger not created until first deposit
      }
    }
    setWallet({
      connected: true,
      address: publicKey.toBase58(),
      walletBalance: lamports / LAMPORTS_PER_SOL,
      casinoBalance: casino,
    });
  }, [publicKey, connection, program]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = useCallback(async () => {
    setVisible(true);
  }, [setVisible]);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    setWallet(DISCONNECTED);
    setGamePhase("idle");
    setLastOutcome(null);
  }, [disconnectWallet]);

  const deposit = useCallback(
    async (amount: number) => {
      if (!program || !publicKey)
        return { ok: false, error: "Connect your wallet first." };
      if (amount <= 0)
        return { ok: false, error: "Enter an amount greater than zero." };
      try {
        const sig = await (program.methods as any)
          .deposit(toLamports(amount))
          .accountsPartial({
            player: publicKey,
            vault: vaultPda(),
            playerState: playerPda(publicKey),
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        recordTx({
          id: `tx-${Date.now()}`,
          type: "deposit",
          amount,
          timestamp: Date.now(),
          signature: sig,
          status: "confirmed",
        });
        await refresh();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: parseErr(e) };
      }
    },
    [program, publicKey, recordTx, refresh],
  );

  const withdraw = useCallback(
    async (amount: number) => {
      if (!program || !publicKey)
        return { ok: false, error: "Connect your wallet first." };
      if (amount <= 0)
        return { ok: false, error: "Enter an amount greater than zero." };
      try {
        const sig = await (program.methods as any)
          .withdraw(toLamports(amount))
          .accountsPartial({
            player: publicKey,
            vault: vaultPda(),
            playerState: playerPda(publicKey),
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        recordTx({
          id: `tx-${Date.now()}`,
          type: "withdraw",
          amount,
          timestamp: Date.now(),
          signature: sig,
          status: "confirmed",
        });
        await refresh();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: parseErr(e) };
      }
    },
    [program, publicKey, recordTx, refresh],
  );

  const flip = useCallback(
    async (side: CoinSide, amount: number) => {
      if (!program || !publicKey)
        return { ok: false, error: "Connect your wallet first." };
      if (amount > wallet.casinoBalance)
        return { ok: false, error: "Insufficient casino balance. Deposit more SOL." };

      setGamePhase("pending");
      setLastOutcome(null);

      try {
        const pda = playerPda(publicKey);
        const before = (
          await (program.account as any).playerState.fetch(pda)
        ).balance.toNumber();

        const sideNum = side === "heads" ? 0 : 1;
        const clientSeed = new BN(Math.floor(Math.random() * 1_000_000_000));

        const sig = await (program.methods as any)
          .placeBet(sideNum, toLamports(amount), clientSeed)
          .accountsPartial({ player: publicKey, playerState: pda })
          .rpc();

        const ps = await (program.account as any).playerState.fetch(pda);
        const after = ps.balance.toNumber();
        const outcome: CoinSide = ps.lastResult === 0 ? "heads" : "tails";
        const won = after > before;
        const result: BetResult = won ? "win" : "lose";
        const payout = won ? payoutFor(amount) : 0;

        const bet: Bet = {
          id: `bet-${Date.now()}`,
          timestamp: Date.now(),
          side,
          outcome,
          amount,
          result,
          payout,
          signature: sig,
        };
        setBets((prev) => [bet, ...prev]);
        recordTx({
          id: `tx-${bet.id}`,
          type: "bet",
          amount,
          timestamp: bet.timestamp,
          signature: sig,
          status: "confirmed",
        });

        const data: FlipOutcome = { outcome, result, payout, bet };
        setLastOutcome(data);
        setGamePhase(result);
        await refresh();
        return { ok: true };
      } catch (e) {
        setGamePhase("idle");
        return { ok: false, error: parseErr(e) };
      }
    },
    [program, publicKey, wallet.casinoBalance, recordTx, refresh],
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
