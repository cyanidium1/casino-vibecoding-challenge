"use client";

import { useEffect, useRef } from "react";
import {
  animate,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "motion/react";
import type { CoinSide } from "@/types";
import { cn } from "@/lib/utils/cn";

interface CoinProps {
  /** the side currently facing the viewer (resting target) */
  facing?: CoinSide;
  /** continuous spin while a flip is in flight (signature + confirming) */
  spinning?: boolean;
  size?: number;
  className?: string;
  /** ambient idle float + glow (hero use) */
  ambient?: boolean;
}

/** Custom coin artwork (transparent PNGs) for each face. */
export const COIN_SRC: Record<CoinSide, string> = {
  heads: "/brand/coin-heads.webp",
  tails: "/brand/coin-tails.webp",
};

/** rotateY residue (mod 360) that shows a given face to the viewer. */
const residueFor = (side: CoinSide) => (side === "heads" ? 0 : 180);

/**
 * Smallest angle that (a) shows `residue` (≡ residue mod 360), (b) is reached by
 * rotating *forward* from `from`, and (c) adds at least `minTurns` full turns.
 * Guarantees every target is monotonically ≥ the live angle, so the coin never
 * spins backwards or jerks — even mid-animation.
 */
function nextForward(from: number, residue: number, minTurns = 0): number {
  const min = from + minTurns * 360;
  const k = Math.ceil((min - residue) / 360);
  return residue + k * 360;
}

function Face({ side }: { side: CoinSide }) {
  const isHeads = side === "heads";
  return (
    <div
      className="absolute inset-0"
      style={{
        backfaceVisibility: "hidden",
        transform: isHeads ? "rotateY(0deg)" : "rotateY(180deg)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={COIN_SRC[side]}
        alt={isHeads ? "Heads" : "Tails"}
        draggable={false}
        className="h-full w-full select-none object-contain drop-shadow-[0_10px_26px_rgba(0,0,0,0.55)]"
      />
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
  // Track rotation/levitation as motion values so we can read the *live* angle
  // when transitioning from an endless spin into a single forward landing.
  const spinner = useRef<HTMLDivElement>(null);
  const rotateY = useMotionValue(0);
  const y = useMotionValue(0);
  // Honour the OS "reduce motion" setting for the gratuitous idle levitation.
  // The flip spin + landing stay (they convey real game state), but the endless
  // ambient bob is suppressed.
  const reduce = useReducedMotion();
  // Distinguishes "land coming out of a spin" (long decel) from "idle settle"
  // (short snap), and lets us add at least one full turn so the reveal is never
  // a backwards twitch.
  const wasSpinning = useRef(false);

  // Mirror the motion values onto the DOM ourselves. Writing the transform in an
  // effect (rather than via motion's `style` binding) keeps the SSR markup and
  // the first client render identical (no transform) — no hydration mismatch.
  useEffect(() => {
    const el = spinner.current;
    if (!el) return;
    const write = () => {
      el.style.transform = `translateY(${y.get()}px) rotateY(${rotateY.get()}deg)`;
    };
    write();
    const unsubR = rotateY.on("change", write);
    const unsubY = y.on("change", write);
    return () => {
      unsubR();
      unsubY();
    };
  }, [rotateY, y]);

  useEffect(() => {
    const controls: AnimationPlaybackControls[] = [];
    let cancelled = false;
    const residue = residueFor(facing);

    if (spinning) {
      // Continuous forward spin at a steady pace. We aim ~1000 turns ahead so it
      // simply keeps going through the whole signature + confirming wait, and is
      // cut off cleanly when we settle. ~0.55s/turn reads as lively, not dizzy.
      const from = rotateY.get();
      const target = nextForward(from, residue, 1000);
      const turns = (target - from) / 360;
      controls.push(
        animate(rotateY, target, { duration: turns * 0.55, ease: "linear" }),
      );
      controls.push(animate(y, 0, { duration: 0.3, ease: "easeOut" }));
      wasSpinning.current = true;
    } else {
      // Settle / idle: land forward on the resting face exactly once. Coming out
      // of a spin we add a full turn and use a long decel; a plain idle settle is
      // a short, springy snap.
      const fromSpin = wasSpinning.current;
      const target = nextForward(rotateY.get(), residue, fromSpin ? 1 : 0);
      const land = animate(rotateY, target, {
        duration: fromSpin ? 1.1 : 0.9,
        ease: fromSpin ? [0.16, 1, 0.3, 1] : [0.34, 1.56, 0.64, 1],
      });
      controls.push(land);
      controls.push(animate(y, 0, { duration: 0.4, ease: "easeOut" }));
      wasSpinning.current = false;

      if (ambient && !reduce) {
        // Once landed, resume the gentle levitation (vertical bob + rotateY
        // wobble) centred on the resting face.
        void land.then(() => {
          if (cancelled || !spinner.current) return;
          controls.push(
            animate(
              rotateY,
              [target, target + 14, target, target - 14, target],
              { duration: 7, repeat: Infinity, ease: "easeInOut" },
            ),
          );
          controls.push(
            animate(y, [0, -10, 0], {
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
            }),
          );
        });
      }
    }

    return () => {
      cancelled = true;
      controls.forEach((c) => c.stop());
    };
  }, [facing, spinning, ambient, reduce, rotateY, y]);

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
              : "radial-gradient(circle, rgba(124,77,255,0.5), transparent 65%)",
          transition: "background 0.4s ease",
        }}
      />
      <div
        ref={spinner}
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        <Face side="heads" />
        <Face side="tails" />
      </div>
    </div>
  );
}
