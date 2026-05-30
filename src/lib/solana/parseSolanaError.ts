/**
 * Normalizes the many shapes of Solana / Anchor / wallet-adapter errors into a
 * single, debug-friendly structure used by the notification layer.
 *
 * Handles: Anchor program errors, custom program errors (0x… codes), wallet
 * adapter errors, user-rejection, insufficient funds, blockhash / confirmation
 * timeouts, RPC / network failures, account-fetch failures, and plain JS errors.
 */

export type ActionContext =
  | "connect"
  | "disconnect"
  | "deposit"
  | "flip"
  | "withdraw"
  | "balance"
  | "history";

export type ErrorKind =
  | "user-rejected"
  | "insufficient-funds"
  | "anchor"
  | "program"
  | "wallet"
  | "network"
  | "confirmation"
  | "account"
  | "validation"
  | "unknown";

export interface ParsedSolanaError {
  /** Short, human-readable headline for the toast title. */
  title: string;
  /** Raw underlying error message (best-effort extraction). */
  detail: string;
  /** Error name / numeric code, when one is available (e.g. "6001 · InsufficientBalance"). */
  code?: string;
  /** Transaction signature, when the failure happened after submission. */
  signature?: string;
  /** Coarse category, drives icon / duration / messaging. */
  kind: ErrorKind;
  /** Program logs, when present — invaluable for debugging on-chain failures. */
  logs?: string[];
}

/** Friendly titles for our program's declared error codes (mirrors the IDL). */
const ANCHOR_ERROR_TITLES: Record<number, string> = {
  6000: "Amount must be greater than zero",
  6001: "Insufficient casino balance",
  6002: "Invalid coin side",
  6003: "Wrong player account",
  6004: "Arithmetic overflow",
};

function rawMessage(e: unknown): string {
  if (e == null) return "Unknown error";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message || e.name;
  if (typeof e === "object") {
    const o = e as Record<string, unknown> & {
      error?: { errorMessage?: string };
      message?: string;
    };
    if (o.error?.errorMessage) return o.error.errorMessage;
    if (typeof o.message === "string" && o.message) return o.message;
    try {
      return JSON.stringify(o);
    } catch {
      return String(o);
    }
  }
  return String(e);
}

function extractLogs(e: unknown): string[] | undefined {
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown> & {
      logs?: unknown;
      error?: { logs?: unknown };
    };
    const logs = (o.logs ?? o.error?.logs) as unknown;
    if (Array.isArray(logs)) return logs as string[];
  }
  return undefined;
}

/** Pull an Anchor `{ error: { errorCode, errorMessage } }` shape if present. */
function extractAnchor(e: unknown): { number?: number; code?: string; msg?: string } | null {
  if (!e || typeof e !== "object") return null;
  const o = e as {
    error?: { errorCode?: { code?: string; number?: number }; errorMessage?: string };
    code?: number;
    msg?: string;
  };
  if (o.error?.errorCode) {
    return {
      number: o.error.errorCode.number,
      code: o.error.errorCode.code,
      msg: o.error.errorMessage,
    };
  }
  // Bare `{ code: 6001, msg: "…" }` (raw IDL error)
  if (typeof o.code === "number" && o.code >= 6000 && o.code < 7000) {
    return { number: o.code, msg: o.msg };
  }
  return null;
}

/** Parse a `custom program error: 0x…` code out of a free-text message. */
function extractCustomProgramCode(msg: string): number | null {
  const m = msg.match(/custom program error:\s*(0x[0-9a-fA-F]+|\d+)/);
  if (!m) return null;
  const val = m[1].startsWith("0x") ? parseInt(m[1], 16) : parseInt(m[1], 10);
  return Number.isNaN(val) ? null : val;
}

function extractSignature(e: unknown): string | undefined {
  if (e && typeof e === "object") {
    const o = e as { signature?: unknown };
    if (typeof o.signature === "string") return o.signature;
  }
  return undefined;
}

const re = (s: string) => new RegExp(s, "i");

export function parseSolanaError(
  error: unknown,
  context?: ActionContext,
): ParsedSolanaError {
  const detail = rawMessage(error);
  const logs = extractLogs(error);
  const signature = extractSignature(error);
  const lower = detail.toLowerCase();

  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: unknown }).name ?? "")
      : "";
  const numericCode =
    error && typeof error === "object" && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;

  const base = (
    over: Partial<ParsedSolanaError> & Pick<ParsedSolanaError, "title" | "kind">,
  ): ParsedSolanaError => ({ detail, logs, signature, ...over });

  // 1) User rejection (wallet "cancel"). Check first — it's the most common.
  if (
    numericCode === 4001 ||
    re("user rejected|user denied|rejected the request|request rejected|declined|user cancel").test(lower) ||
    name === "WalletSignTransactionError" && re("reject|denied|cancel").test(lower)
  ) {
    return base({
      title:
        context === "connect"
          ? "Wallet connection rejected"
          : "Transaction rejected in wallet",
      kind: "user-rejected",
      code: numericCode === 4001 ? "4001" : name || undefined,
    });
  }

  // 2) Anchor / our own program errors.
  const anchor = extractAnchor(error);
  if (anchor?.number != null) {
    const friendly = ANCHOR_ERROR_TITLES[anchor.number];
    const isFunds = anchor.number === 6001;
    return base({
      title: friendly ?? anchor.msg ?? "Program rejected the transaction",
      kind: isFunds ? "insufficient-funds" : "anchor",
      code: `${anchor.number}${anchor.code ? ` · ${anchor.code}` : ""}`,
    });
  }

  // 3) Custom program error code embedded in the message (0x…).
  const customCode = extractCustomProgramCode(detail);
  if (customCode != null) {
    const friendly = ANCHOR_ERROR_TITLES[customCode];
    return base({
      title: friendly ?? "On-chain program error",
      kind: customCode === 6001 ? "insufficient-funds" : "program",
      code: `0x${customCode.toString(16)} (${customCode})`,
    });
  }

  // 4) Insufficient funds (system-level / lamports).
  if (
    re("insufficient lamports|insufficient funds|debit an account but found no record|attempt to debit|not enough").test(
      lower,
    )
  ) {
    return base({ title: "Insufficient balance", kind: "insufficient-funds" });
  }

  // 5) Blockhash / confirmation expiry.
  if (
    re("blockhash not found|block height exceeded|transactionexpired|was not confirmed|timed out|timeout|expired").test(
      lower,
    )
  ) {
    return base({
      title: "Transaction not confirmed in time",
      kind: "confirmation",
      code: name || undefined,
    });
  }

  // 6) RPC / network failures.
  if (
    re("failed to fetch|fetch failed|networkerror|network error|429|too many requests|503|502|504|econnrefused|enotfound|getaddrinfo|socket hang up").test(
      lower,
    )
  ) {
    return base({ title: "Network / RPC error", kind: "network" });
  }

  // 7) Account / PDA fetch failures.
  if (
    re("account does not exist|could not find|account not found|unable to fetch|invalid account|no record").test(
      lower,
    )
  ) {
    return base({ title: "Account fetch failed", kind: "account" });
  }

  // 8) Generic wallet-adapter errors.
  if (name.startsWith("Wallet") || re("walleterror|wallet not|no wallet").test(lower)) {
    return base({
      title: context === "connect" ? "Wallet connection failed" : "Wallet error",
      kind: "wallet",
      code: name || undefined,
    });
  }

  // 9) Our own client-side guards (thrown as plain Error).
  if (context && re("connect your wallet|greater than zero|exceeds").test(lower)) {
    return base({ title: detail, kind: "validation" });
  }

  // 10) Fallthrough.
  return base({
    title: context === "connect" ? "Wallet connection failed" : "Something went wrong",
    kind: "unknown",
    code: name || (typeof numericCode === "number" ? String(numericCode) : undefined),
  });
}
