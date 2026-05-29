import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface EyebrowProps {
  children: ReactNode;
  /** monospace index shown after the dot, e.g. "01 / 05" */
  index?: string;
  className?: string;
}

/** Pill label with a glowing dot — adapted from reference niche eyebrow. */
export default function Eyebrow({ children, index, className }: EyebrowProps) {
  return (
    <span className={cn("vf-eyebrow", className)}>
      <span className="vf-dot" />
      {children}
      {index && <span className="vf-mono text-[10px] text-white/40">{index}</span>}
    </span>
  );
}
