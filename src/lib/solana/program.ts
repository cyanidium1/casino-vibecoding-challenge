"use client";

import "@/lib/solana/polyfill";
import { useMemo } from "react";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
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
