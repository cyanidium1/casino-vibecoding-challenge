/** Shorten a base58-style address: 7yQ2…k9Tf */
export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

/** Token amount with thin separators, trimming trailing zeros. */
export function formatToken(amount: number, maxFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(amount);
}

const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "12s ago", "3m ago", "2h ago" from an epoch-ms timestamp. */
export function relativeTime(timestamp: number, now: number = Date.now()): string {
  const diffMs = timestamp - now;
  const abs = Math.abs(diffMs);
  const sec = Math.round(diffMs / 1000);
  const min = Math.round(diffMs / 60000);
  const hr = Math.round(diffMs / 3_600_000);
  const day = Math.round(diffMs / 86_400_000);

  if (abs < 60_000) return RTF.format(sec, "second");
  if (abs < 3_600_000) return RTF.format(min, "minute");
  if (abs < 86_400_000) return RTF.format(hr, "hour");
  return RTF.format(day, "day");
}
