"use client";

import { cn } from "@/lib/utils/cn";
import { CASINO } from "@/lib/config";
import { formatToken } from "@/lib/utils/format";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  /** balance shown as the "Max" target */
  max?: number;
  quickAmounts?: readonly number[];
  disabled?: boolean;
  autoFocus?: boolean;
}

/** Numeric token input with quick-fill chips + Max — used by modals and the game. */
export default function AmountInput({
  value,
  onChange,
  max,
  quickAmounts = CASINO.quickAmounts,
  disabled,
  autoFocus,
}: AmountInputProps) {
  const sanitize = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "relative flex items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 transition-colors focus-within:border-main-light/60",
          disabled && "opacity-50",
        )}
      >
        <input
          inputMode="decimal"
          autoFocus={autoFocus}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(sanitize(e.target.value))}
          placeholder="0.00"
          className="h-14 w-full bg-transparent font-display text-[26px] font-bold tracking-tight text-white outline-none placeholder:text-white/25"
        />
        <span className="vf-mono shrink-0 rounded-lg bg-white/[0.06] px-3 py-1.5 text-[13px] font-medium text-main-light">
          {CASINO.tokenSymbol}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {quickAmounts.map((amt) => (
          <button
            key={amt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(String(amt))}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] py-2 text-[13px] font-medium text-white/70 transition-colors hover:border-main-light/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {amt}
          </button>
        ))}
        {max !== undefined && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(String(max))}
            className="rounded-xl border border-main/30 bg-main/10 px-4 py-2 text-[13px] font-semibold text-main-light transition-colors hover:bg-main/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Max
          </button>
        )}
      </div>

      {max !== undefined && (
        <p className="vf-mono text-[11px] text-white/35">
          Available: {formatToken(max, 3)} {CASINO.tokenSymbol}
        </p>
      )}
    </div>
  );
}
