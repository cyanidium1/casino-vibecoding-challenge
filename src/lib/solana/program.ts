"use client";

import "@/lib/solana/polyfill";
import { useMemo } from "react";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey, type Transaction } from "@solana/web3.js";
import idl from "./vibeflip.json";

export const PROGRAM_ID = new PublicKey(idl.address);

export function vaultPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("vault")], PROGRAM_ID)[0];
}

export function playerPda(player: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("player"), player.toBuffer()],
    PROGRAM_ID,
  )[0];
}

/** Phase callbacks so the UI can narrate the wallet-prompt → sent lifecycle. */
export interface TxPhaseCallbacks {
  /** Fired right before the wallet signature prompt is requested. */
  onSign?: () => void;
  /** Fired once the signed tx is submitted to the cluster (has a signature). */
  onSent?: (signature: string) => void;
}

/**
 * Sign → send → confirm a transaction with the connected wallet, exposing each
 * phase via callbacks (used to drive loading→sent→confirmed toasts). Returns the
 * confirmed signature. Throws on rejection / send / confirmation failure, with
 * the signature attached when one exists so error toasts can deep-link it.
 */
export async function signSendConfirm(
  program: Program,
  tx: Transaction,
  cb: TxPhaseCallbacks = {},
): Promise<string> {
  const provider = program.provider as AnchorProvider;
  const { connection, wallet } = provider;

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = wallet.publicKey;

  cb.onSign?.();
  const signed = await wallet.signTransaction(tx);

  const signature = await connection.sendRawTransaction(signed.serialize());
  cb.onSent?.(signature);

  try {
    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    );
  } catch (e) {
    // Attach the signature so the caller can still link the (failed) tx.
    if (e && typeof e === "object" && !("signature" in e)) {
      (e as { signature?: string }).signature = signature;
    }
    throw e;
  }
  return signature;
}

/** Anchor `Program` bound to the connected wallet, or null when disconnected. */
export function useProgram(): Program | null {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    return new Program(idl as Idl, provider);
  }, [connection, wallet]);
}
