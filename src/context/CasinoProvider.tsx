"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BN } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import WalletConnectModal from "@/components/solana/WalletConnectModal";
import type {
  Bet,
  BetResult,
  CoinSide,
  FlipOutcome,
  FlipStatus,
  GamePhase,
  Transaction,
  WalletState,
} from "@/types";
import { useProgram, vaultPda, playerPda, signSendConfirm } from "@/lib/solana/program";
import { fetchFlipHistory, mergeBets } from "@/lib/solana/history";
import { payoutFor } from "@/lib/config";
import { formatToken } from "@/lib/utils/format";
import {
  notifyLoading,
  notifyError,
  notifyTransactionSent,
  notifyTransactionConfirmed,
  notifySuccess,
  notifyInfo,
  notifyWalletConnected,
  notifyWalletDisconnected,
} from "@/lib/notifications";

const DISCONNECTED: WalletState = {
  connected: false,
  address: null,
  walletBalance: 0,
  casinoBalance: 0,
};

interface CasinoContextValue {
  wallet: WalletState;
  /** merged, de-duplicated public on-chain history + local optimistic flips */
  bets: Bet[];
  /** true while public on-chain history is being (re)fetched */
  historyLoading: boolean;
  /** true when the last history fetch failed (drives the feed's error fallback) */
  historyError: boolean;
  /** re-fetch public on-chain flip history */
  refreshHistory: () => Promise<void>;
  transactions: Transaction[];
  connecting: boolean;
  gamePhase: GamePhase;
  /** fine-grained flip lifecycle, drives the coin animation + status label */
  flipStatus: FlipStatus;
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

export function CasinoProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const { publicKey, connecting, disconnect: disconnectWallet } = useWallet();
  const program = useProgram();

  const [wallet, setWallet] = useState<WalletState>(DISCONNECTED);
  // local optimistic flips (this session) — merged with public on-chain history
  const [localBets, setLocalBets] = useState<Bet[]>([]);
  const [chainHistory, setChainHistory] = useState<Bet[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>("idle");
  const [flipStatus, setFlipStatus] = useState<FlipStatus>("idle");
  const [lastOutcome, setLastOutcome] = useState<FlipOutcome | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const recordTx = useCallback((tx: Transaction) => {
    setTransactions((prev) => [tx, ...prev]);
  }, []);

  // Public on-chain history merged with this session's optimistic flips.
  const bets = useMemo(
    () => mergeBets(localBets, chainHistory),
    [localBets, chainHistory],
  );

  /**
   * Fetch public flip history straight from the cluster (program signatures →
   * FlipResult events). Works without a connected wallet — never throws into the
   * render path.
   *
   * The public devnet RPC frequently rate-limits the initial burst (429), so the
   * automatic on-mount load runs `silent` (console warning only). A user-driven
   * Refresh surfaces a real error toast, since they asked for the data.
   */
  const refreshHistory = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      setHistoryLoading(true);
      try {
        const flips = await fetchFlipHistory(connection);
        setChainHistory(flips);
        setHistoryError(false);
      } catch (e) {
        setHistoryError(true);
        if (opts.silent) {
          console.warn(
            "[VibeFlip:history] auto-load failed (likely RPC rate-limit) — will retry on Refresh",
            e,
          );
        } else {
          console.error("[VibeFlip:history] fetch failed", e);
          notifyError(e, "history");
        }
      } finally {
        setHistoryLoading(false);
      }
    },
    [connection],
  );

  // Load public history on first mount (and if the RPC endpoint changes).
  useEffect(() => {
    void refreshHistory({ silent: true });
  }, [refreshHistory]);

  /**
   * Pull fresh wallet SOL + on-chain ledger balance from the cluster.
   * Auto-refreshes are silent (no toast spam); only genuine RPC failures are
   * surfaced. A missing player ledger is expected (until first deposit).
   */
  const refresh = useCallback(async () => {
    if (!publicKey) {
      setWallet(DISCONNECTED);
      return;
    }
    let lamports: number;
    try {
      lamports = await connection.getBalance(publicKey);
    } catch (e) {
      // RPC / network failure reading the wallet balance — worth surfacing.
      notifyError(e, "balance");
      return;
    }
    let casino = 0;
    if (program) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ps = await (program.account as any).playerState.fetch(
          playerPda(publicKey),
        );
        casino = ps.balance.toNumber() / LAMPORTS_PER_SOL;
      } catch {
        casino = 0; // ledger not created until first deposit (expected, silent)
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

  // Surface wallet connect / disconnect as toasts (covers modal + autoconnect).
  const prevConnected = useRef(false);
  useEffect(() => {
    if (publicKey && !prevConnected.current) {
      notifyWalletConnected(publicKey.toBase58());
      setWalletModalOpen(false); // a connection closes the picker
      prevConnected.current = true;
    } else if (!publicKey && prevConnected.current) {
      notifyWalletDisconnected();
      prevConnected.current = false;
    }
  }, [publicKey]);

  const connect = useCallback(async () => {
    setWalletModalOpen(true);
    notifyInfo("Choose your wallet", {
      description: "Phantom recommended · Solana Devnet.",
      duration: 2500,
    });
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await disconnectWallet();
    } catch (e) {
      notifyError(e, "disconnect");
      return;
    }
    setWallet(DISCONNECTED);
    setGamePhase("idle");
    setFlipStatus("idle");
    setLastOutcome(null);
  }, [disconnectWallet]);

  const deposit = useCallback(
    async (amount: number) => {
      if (!program || !publicKey) {
        const p = notifyError(new Error("Connect your wallet first."), "deposit");
        return { ok: false, error: p.title };
      }
      if (amount <= 0) {
        const p = notifyError(
          new Error("Enter an amount greater than zero."),
          "deposit",
        );
        return { ok: false, error: p.title };
      }

      const id = notifyLoading("Waiting for wallet signature…", {
        description: `Deposit · ${formatToken(amount)} SOL`,
      });
      try {
        const tx = await (program.methods as any)
          .deposit(toLamports(amount))
          .accountsPartial({
            player: publicKey,
            vault: vaultPda(),
            playerState: playerPda(publicKey),
            systemProgram: SystemProgram.programId,
          })
          .transaction();

        const sig = await signSendConfirm(program, tx, {
          onSent: (s) => notifyTransactionSent(s, "deposit", id),
        });

        notifyTransactionConfirmed(
          `Deposited ${formatToken(amount)} SOL`,
          sig,
          "deposit",
          id,
        );
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
        const p = notifyError(e, "deposit", { id });
        return { ok: false, error: p.title };
      }
    },
    [program, publicKey, recordTx, refresh],
  );

  const withdraw = useCallback(
    async (amount: number) => {
      if (!program || !publicKey) {
        const p = notifyError(new Error("Connect your wallet first."), "withdraw");
        return { ok: false, error: p.title };
      }
      if (amount <= 0) {
        const p = notifyError(
          new Error("Enter an amount greater than zero."),
          "withdraw",
        );
        return { ok: false, error: p.title };
      }

      const id = notifyLoading("Waiting for wallet signature…", {
        description: `Withdraw · ${formatToken(amount)} SOL`,
      });
      try {
        const tx = await (program.methods as any)
          .withdraw(toLamports(amount))
          .accountsPartial({
            player: publicKey,
            vault: vaultPda(),
            playerState: playerPda(publicKey),
            systemProgram: SystemProgram.programId,
          })
          .transaction();

        const sig = await signSendConfirm(program, tx, {
          onSent: (s) => notifyTransactionSent(s, "withdraw", id),
        });

        notifyTransactionConfirmed(
          `Withdrew ${formatToken(amount)} SOL`,
          sig,
          "withdraw",
          id,
        );
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
        const p = notifyError(e, "withdraw", { id });
        return { ok: false, error: p.title };
      }
    },
    [program, publicKey, recordTx, refresh],
  );

  const flip = useCallback(
    async (side: CoinSide, amount: number) => {
      if (!program || !publicKey) {
        const p = notifyError(new Error("Connect your wallet first."), "flip");
        return { ok: false, error: p.title };
      }
      if (amount > wallet.casinoBalance) {
        const p = notifyError(
          new Error("Insufficient casino balance. Deposit more SOL."),
          "flip",
        );
        return { ok: false, error: p.title };
      }

      setGamePhase("pending");
      setFlipStatus("awaiting_signature");
      setLastOutcome(null);

      const id = notifyLoading("Waiting for wallet signature…", {
        description: `Coin flip · ${formatToken(amount)} SOL on ${side}`,
      });
      try {
        const pda = playerPda(publicKey);
        const before = (
          await (program.account as any).playerState.fetch(pda)
        ).balance.toNumber();

        const sideNum = side === "heads" ? 0 : 1;
        const clientSeed = new BN(Math.floor(Math.random() * 1_000_000_000));

        const tx = await (program.methods as any)
          .placeBet(sideNum, toLamports(amount), clientSeed)
          .accountsPartial({ player: publicKey, playerState: pda })
          .transaction();

        const sig = await signSendConfirm(program, tx, {
          onSent: (s) => {
            // signature submitted → leave the "waiting for wallet" phase and
            // keep the coin spinning while the cluster confirms the tx.
            setFlipStatus("confirming");
            notifyTransactionSent(s, "flip", id);
          },
        });

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
          player: publicKey.toBase58(),
          newBalance: after / LAMPORTS_PER_SOL,
        };
        setLocalBets((prev) => [bet, ...prev]);
        recordTx({
          id: `tx-${bet.id}`,
          type: "bet",
          amount,
          timestamp: bet.timestamp,
          signature: sig,
          status: "confirmed",
        });

        // Resolve the loading toast into the win / loss result.
        if (won) {
          notifySuccess(`Heads or tails — you won! +${formatToken(payout)} SOL`, {
            id,
            description: `Landed ${outcome} · settled on Devnet`,
            signature: sig,
          });
        } else {
          notifyInfo(`Landed ${outcome} — you lost ${formatToken(amount)} SOL`, {
            id,
            description: "Flip settled on Devnet",
            signature: sig,
          });
        }

        const data: FlipOutcome = { outcome, result, payout, bet };
        setLastOutcome(data);
        // settle: result + status flip together so the coin lands exactly once
        // on the confirmed on-chain outcome.
        setFlipStatus("settled");
        setGamePhase(result);
        await refresh();
        return { ok: true };
      } catch (e) {
        // rejected / failed: no fake result — return smoothly to idle.
        setFlipStatus("error");
        setGamePhase("idle");
        const p = notifyError(e, "flip", { id });
        return { ok: false, error: p.title };
      }
    },
    [program, publicKey, wallet.casinoBalance, recordTx, refresh],
  );

  const resetGame = useCallback(() => {
    setGamePhase("idle");
    setFlipStatus("idle");
    setLastOutcome(null);
  }, []);

  const value = useMemo<CasinoContextValue>(
    () => ({
      wallet,
      bets,
      historyLoading,
      historyError,
      refreshHistory,
      transactions,
      connecting,
      gamePhase,
      flipStatus,
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
      historyLoading,
      historyError,
      refreshHistory,
      transactions,
      connecting,
      gamePhase,
      flipStatus,
      lastOutcome,
      connect,
      disconnect,
      deposit,
      withdraw,
      flip,
      resetGame,
    ],
  );

  return (
    <CasinoContext.Provider value={value}>
      {children}
      <WalletConnectModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
    </CasinoContext.Provider>
  );
}

export function useCasino(): CasinoContextValue {
  const ctx = useContext(CasinoContext);
  if (!ctx) throw new Error("useCasino must be used within a CasinoProvider");
  return ctx;
}
