/**
 * Thin, opinionated wrapper around `sonner` for all user-facing blockchain
 * actions. Centralizes copy, the dark-neon styling hooks, Explorer links, and
 * the loading→success/error update lifecycle so callers stay declarative.
 *
 * Every error path here ALSO logs the full error object to the console — toasts
 * are for humans, the console is for debugging.
 */
import { toast } from "sonner";
import { explorerTx } from "@/lib/config";
import { shortenAddress } from "@/lib/utils/format";
import {
  parseSolanaError,
  type ActionContext,
  type ParsedSolanaError,
} from "@/lib/solana/parseSolanaError";

type ToastId = string | number;

const isDev = process.env.NODE_ENV !== "production";

const CONTEXT_LABEL: Record<ActionContext, string> = {
  connect: "Connect",
  disconnect: "Disconnect",
  deposit: "Deposit",
  flip: "Coin flip",
  withdraw: "Withdraw",
  balance: "Balance refresh",
  history: "History",
};

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function openExplorer(signature: string) {
  if (typeof window !== "undefined") {
    window.open(explorerTx(signature), "_blank", "noopener,noreferrer");
  }
}

/** Sonner `action` button that deep-links a signature to Solana Explorer. */
function explorerAction(signature?: string) {
  if (!signature) return undefined;
  return {
    label: "Explorer ↗",
    onClick: () => openExplorer(signature),
  };
}

// ---------------------------------------------------------------------------
// Generic primitives
// ---------------------------------------------------------------------------

export function notifySuccess(
  message: string,
  opts: { id?: ToastId; description?: string; signature?: string; duration?: number } = {},
): ToastId {
  return toast.success(message, {
    id: opts.id,
    description: opts.description,
    action: explorerAction(opts.signature),
    duration: opts.duration,
  });
}

export function notifyInfo(
  message: string,
  opts: { id?: ToastId; description?: string; signature?: string; duration?: number } = {},
): ToastId {
  // Use the typed `toast.info` (not the base `toast()`): when this reuses the
  // id of a prior `toast.loading`, a concrete type is required to clear the
  // spinner — the base call leaves the toast stuck in its loading state.
  return toast.info(message, {
    id: opts.id,
    description: opts.description,
    action: explorerAction(opts.signature),
    duration: opts.duration,
  });
}

/** Loading toast; reuse the returned id to update it in place later. */
export function notifyLoading(
  message: string,
  opts: { id?: ToastId; description?: string } = {},
): ToastId {
  return toast.loading(message, { id: opts.id, description: opts.description });
}

export function dismiss(id?: ToastId) {
  toast.dismiss(id);
}

// ---------------------------------------------------------------------------
// Errors — always logged in full, always surfaced with useful debug context.
// ---------------------------------------------------------------------------

export function notifyError(
  error: unknown,
  context: ActionContext,
  opts: { id?: ToastId; signature?: string } = {},
): ParsedSolanaError {
  const parsed = parseSolanaError(error, context);
  const signature = opts.signature ?? parsed.signature;

  // Rule #8: never hide errors in the console only — and never lose the raw object.
  console.error(`[VibeFlip:${context}]`, {
    title: parsed.title,
    kind: parsed.kind,
    code: parsed.code,
    signature,
    detail: parsed.detail,
    logs: parsed.logs,
    raw: error,
  });

  const label = CONTEXT_LABEL[context];
  const codePart = parsed.code ? ` · ${parsed.code}` : "";
  // In dev show the full raw message; in prod keep it readable for judges.
  const rawDetail = isDev ? parsed.detail : truncate(parsed.detail, 160);
  const sameAsTitle = rawDetail.trim() === parsed.title.trim();
  const description = sameAsTitle
    ? `${label}${codePart}`
    : `${label}${codePart} · ${rawDetail}`;

  toast.error(parsed.title, {
    id: opts.id,
    description,
    action: explorerAction(signature),
    duration: parsed.kind === "user-rejected" ? 4000 : 8000,
  });

  return parsed;
}

// ---------------------------------------------------------------------------
// Transaction lifecycle: sent → confirming → finalized
// ---------------------------------------------------------------------------

/** Tx submitted to the cluster, awaiting confirmation. Keeps the spinner. */
export function notifyTransactionSent(
  signature: string,
  context: ActionContext,
  id?: ToastId,
): ToastId {
  return toast.loading("Confirming on Solana Devnet…", {
    id,
    description: `${CONTEXT_LABEL[context]} · ${shortenAddress(signature, 6)}`,
    action: explorerAction(signature),
  });
}

/** Tx confirmed on-chain. Resolves the spinner to a success toast. */
export function notifyTransactionConfirmed(
  message: string,
  signature: string,
  context: ActionContext,
  id?: ToastId,
): ToastId {
  return toast.success(message, {
    id,
    description: `${CONTEXT_LABEL[context]} · ${shortenAddress(signature, 6)}`,
    action: explorerAction(signature),
  });
}

// ---------------------------------------------------------------------------
// Wallet lifecycle
// ---------------------------------------------------------------------------

export function notifyWalletConnected(address: string): ToastId {
  return toast.success("Wallet connected", {
    description: shortenAddress(address, 4),
  });
}

export function notifyWalletDisconnected(): ToastId {
  return toast("Wallet disconnected", { description: "Session ended." });
}
