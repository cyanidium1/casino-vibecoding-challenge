/**
 * Public on-chain game history.
 *
 * Reads recent confirmed transactions for the deployed program, parses the
 * Anchor `FlipResult` event out of each transaction's logs, and maps them to
 * the shared `Bet` shape so the History UI can render *public* flips (not just
 * the current session). Read-only — never signs or mutates anything.
 */
import { BorshCoder, EventParser } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, type Connection } from "@solana/web3.js";
import idl from "./vibeflip.json";
import { PROGRAM_ID } from "./program";
import type { Bet, CoinSide } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const coder = new BorshCoder(idl as any);
const eventParser = new EventParser(PROGRAM_ID, coder);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toNum(v: any): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v.toNumber === "function") return v.toNumber();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lamportsToSol = (v: any) => toNum(v) / LAMPORTS_PER_SOL;
const sideFrom = (n: number): CoinSide => (n === 0 ? "heads" : "tails");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Does this error look like a transient rate-limit we should back off on? */
function isRateLimited(e: unknown): boolean {
  const msg = String((e as Error)?.message ?? e).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("too many requests") ||
    msg.includes("rate limit")
  );
}

/**
 * Retry a flaky RPC call with exponential backoff + jitter. The public devnet
 * endpoint (`api.devnet.solana.com`) heavily rate-limits the transaction-fetch
 * methods and answers bursts with HTTP 429 ("Too many requests"); a few patient
 * retries usually clear it.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (!isRateLimited(e) || i === attempts - 1) break;
      // 700ms, 1400ms, 2800ms (+ up to 300ms jitter) — spreads retries out so
      // we stop hammering a throttled endpoint.
      const backoff = 700 * 2 ** i + Math.floor(Math.random() * 300);
      await sleep(backoff);
    }
  }
  throw lastError;
}

/** How many signatures to bundle into one `getParsedTransactions` call. */
const CHUNK_SIZE = 6;
/** Pause between batches so we stay under the per-method rate limit. */
const CHUNK_GAP_MS = 220;

/**
 * Fetch the most recent public flips settled by the program.
 *
 * @param connection cluster connection (devnet)
 * @param limit      how many recent program signatures to scan (default 25)
 */
export async function fetchFlipHistory(
  connection: Connection,
  limit = 18,
): Promise<Bet[]> {
  const signatures = await withRetry(() =>
    connection.getSignaturesForAddress(PROGRAM_ID, { limit }),
  );
  // Only successful transactions can carry a settled flip event.
  const ok = signatures.filter((s) => !s.err);
  if (ok.length === 0) return [];

  const flips: Bet[] = [];
  let allChunksFailed = ok.length > 0;
  let anyChunkFailed = false;

  // Fetch parsed transactions in small batches. The public devnet RPC rate-
  // limits `getParsedTransactions` aggressively, so a single 18-signature call
  // tends to 429. Small sequential batches (each retried) stay under the limit;
  // a batch that still fails is skipped so we render *partial* history instead
  // of nothing.
  for (let i = 0; i < ok.length; i += CHUNK_SIZE) {
    const batch = ok.slice(i, i + CHUNK_SIZE);

    let txs;
    try {
      txs = await withRetry(() =>
        connection.getParsedTransactions(
          batch.map((s) => s.signature),
          { maxSupportedTransactionVersion: 0, commitment: "confirmed" },
        ),
      );
    } catch (e) {
      anyChunkFailed = true;
      console.warn(
        "[VibeFlip:history] batch fetch failed (rate-limit?) — skipping",
        e,
      );
      continue;
    }
    allChunksFailed = false;

    txs.forEach((tx, j) => {
      const info = batch[j];
      const logs = tx?.meta?.logMessages;
      if (!logs || logs.length === 0) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let events: { name: string; data: any }[] = [];
      try {
        events = [...eventParser.parseLogs(logs)];
      } catch (e) {
        // Parsing one tx must never break the whole feed — log + skip.
        console.warn("[VibeFlip:history] parseLogs failed", {
          signature: info.signature,
          error: e,
        });
        return;
      }

      for (const ev of events) {
        if (ev.name.toLowerCase() !== "flipresult") continue;
        const d = ev.data;
        const won = Boolean(d.won);
        const amount = lamportsToSol(d.amount);
        // event carries NET win; the History "Payout" column shows gross return
        // (stake + net) to match the local optimistic rows.
        const netWin = lamportsToSol(d.netWin ?? d.net_win);
        const newBalance = lamportsToSol(d.newBalance ?? d.new_balance);
        const player =
          typeof d.player?.toBase58 === "function"
            ? d.player.toBase58()
            : String(d.player ?? "");

        flips.push({
          id: `chain-${info.signature}`,
          timestamp: info.blockTime ? info.blockTime * 1000 : Date.now(),
          side: sideFrom(toNum(d.side)),
          outcome: sideFrom(toNum(d.outcome)),
          amount,
          result: won ? "win" : "lose",
          payout: won ? netWin + amount : 0,
          signature: info.signature,
          player,
          newBalance,
        });
      }
    });

    // Breathe between batches so we don't trip the per-method rate limit.
    if (i + CHUNK_SIZE < ok.length) await sleep(CHUNK_GAP_MS);
  }

  // If every batch failed we genuinely have nothing — surface it so the caller
  // shows the error fallback instead of a misleading empty feed. Partial
  // success (some batches loaded) is returned as-is.
  if (allChunksFailed && anyChunkFailed) {
    throw new Error(
      "Public Devnet RPC rate limit — too many requests for transaction history. Please retry in a moment.",
    );
  }

  return flips;
}

/**
 * Merge local optimistic flips with fetched on-chain flips, de-duplicated by
 * transaction signature (a local row and its confirmed on-chain twin share the
 * same signature), enriched with whichever source has the richer fields, and
 * sorted newest-first.
 */
export function mergeBets(local: Bet[], chain: Bet[]): Bet[] {
  const map = new Map<string, Bet>();
  for (const b of [...local, ...chain]) {
    const existing = map.get(b.signature);
    if (!existing) {
      map.set(b.signature, b);
      continue;
    }
    map.set(b.signature, {
      ...existing,
      ...b,
      // keep the earliest (local optimistic) id + timestamp for stable ordering
      id: existing.id,
      timestamp: existing.timestamp || b.timestamp,
      // prefer whichever source actually has the enriched fields
      player: existing.player ?? b.player,
      newBalance: existing.newBalance ?? b.newBalance,
    });
  }
  return [...map.values()].sort((a, b) => b.timestamp - a.timestamp);
}
