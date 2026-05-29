"use client";

import { motion } from "motion/react";
import type { CoinSide } from "@/types";
import { cn } from "@/lib/utils/cn";

interface CoinProps {
  /** the side currently facing the viewer */
  facing?: CoinSide;
  /** spinning state for an in-flight flip */
  spinning?: boolean;
  size?: number;
  className?: string;
  /** ambient idle float + glow (hero use) */
  ambient?: boolean;
}

function Face({ side }: { side: CoinSide }) {
  const isHeads = side === "heads";
  return (
    <div
      className="absolute inset-0 flex items-center justify-center rounded-full"
      style={{
        backfaceVisibility: "hidden",
        transform: isHeads ? "rotateY(0deg)" : "rotateY(180deg)",
        background: isHeads
          ? "radial-gradient(circle at 32% 28%, #b5daff 0%, #268df4 45%, #0c63b8 100%)"
          : "radial-gradient(circle at 32% 28%, #ff9fda 0%, #f80498 48%, #b00270 100%)",
        boxShadow: isHeads
          ? "inset 0 0 0 4px rgba(255,255,255,0.22), inset 0 -14px 30px rgba(0,0,0,0.35)"
          : "inset 0 0 0 4px rgba(255,255,255,0.24), inset 0 -14px 30px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className="flex h-[78%] w-[78%] items-center justify-center rounded-full"
        style={{
          border: `2px dashed rgba(255,255,255,0.35)`,
        }}
      >
        <span
          className="font-display font-extrabold"
          style={{
            fontSize: "44%",
            letterSpacing: "-0.04em",
            color: "#fff",
            textShadow: "0 2px 6px rgba(0,0,0,0.4)",
          }}
        >
          {isHeads ? "V" : "✦"}
        </span>
      </div>
    </div>
  );
}

export default function Coin({
  facing = "heads",
  spinning = false,
  size = 240,
  className,
  ambient = false,
}: CoinProps) {
  // resting rotation: heads = 0, tails = 180; spinning adds many turns.
  const rest = facing === "heads" ? 0 : 180;
  const target = spinning ? rest + 360 * 6 : rest;

  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size, perspective: 1000 }}
    >
      {/* glow */}
      <div
        className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          width: size * 1.15,
          height: size * 1.15,
          background:
            facing === "heads"
              ? "radial-gradient(circle, rgba(38,141,244,0.5), transparent 65%)"
              : "radial-gradient(circle, rgba(248,4,152,0.5), transparent 65%)",
          transition: "background 0.4s ease",
        }}
      />
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={
          ambient && !spinning
            ? { rotateY: [0, 14, 0, -14, 0], y: [0, -10, 0] }
            : { rotateY: target }
        }
        transition={
          ambient && !spinning
            ? { duration: 7, repeat: Infinity, ease: "easeInOut" }
            : spinning
              ? { duration: 1.9, ease: [0.4, 0, 0.2, 1] }
              : { duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }
        }
      >
        <Face side="heads" />
        <Face side="tails" />
      </motion.div>
    </div>
  );
}
