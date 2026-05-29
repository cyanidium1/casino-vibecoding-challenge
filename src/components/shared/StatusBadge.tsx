import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "main" | "success" | "danger" | "blue" | "live";

interface StatusBadgeProps {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}

const TONES: Record<Tone, string> = {
  neutral: "text-white/70 border-white/12 bg-white/[0.03]",
  main: "text-main-light border-main/30 bg-main/10",
  success: "text-success border-success/30 bg-success/10",
  danger: "text-danger border-danger/30 bg-danger/10",
  blue: "text-blue-bright border-blue/30 bg-blue/10",
  live: "text-success border-success/30 bg-success/10",
};

const DOT_TONES: Record<Tone, string> = {
  neutral: "bg-white/50",
  main: "bg-main-light shadow-[0_0_8px_var(--color-main-light)]",
  success: "bg-success shadow-[0_0_8px_var(--color-success)]",
  danger: "bg-danger shadow-[0_0_8px_var(--color-danger)]",
  blue: "bg-blue-bright shadow-[0_0_8px_var(--color-blue-bright)]",
  live: "bg-success shadow-[0_0_8px_var(--color-success)]",
};

export default function StatusBadge({
  children,
  tone = "neutral",
  dot = true,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.04em]",
        TONES[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            DOT_TONES[tone],
            tone === "live" && "animate-pulse",
          )}
        />
      )}
      {children}
    </span>
  );
}
