import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: "main" | "blue" | "success";
  className?: string;
}

const ACCENTS = {
  main: "text-main-light",
  blue: "text-blue-bright",
  success: "text-success",
} as const;

export default function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "main",
  className,
}: StatCardProps) {
  return (
    <div className={cn("vf-card vf-card-hover p-5", className)}>
      <div className="flex items-center justify-between">
        <span className="vf-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
          {label}
        </span>
        {icon && <span className={cn("opacity-80", ACCENTS[accent])}>{icon}</span>}
      </div>
      <div className="mt-3 font-display text-[26px] font-bold leading-none tracking-tight text-white">
        {value}
      </div>
      {hint && <p className="mt-2 text-[12px] text-white/45">{hint}</p>}
    </div>
  );
}
