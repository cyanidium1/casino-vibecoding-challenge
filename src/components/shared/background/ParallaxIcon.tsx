"use client";

import { motion, useReducedMotion, type MotionValue } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface ParallaxIconProps {
  children: ReactNode;
  /** Scroll-linked vertical movement for this layer (px). */
  y: MotionValue<number>;
  /** CSS position. Use percentages so it scales with the viewport. */
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  /** Render size in px. */
  size?: number;
  /** Base opacity of the glyph. Kept low so foreground stays readable. */
  opacity?: number;
  /** Resting rotation in degrees. */
  rotate?: number;
  /** Idle float timing. */
  floatDuration?: number;
  floatDelay?: number;
  className?: string;
}

/**
 * A single decorative glyph that drifts with scroll (parallax `y`) and breathes
 * with a gentle infinite float. Movement is disabled under prefers-reduced-motion.
 */
export default function ParallaxIcon({
  children,
  y,
  top,
  left,
  right,
  bottom,
  size = 56,
  opacity = 0.12,
  rotate = 0,
  floatDuration = 9,
  floatDelay = 0,
  className,
}: ParallaxIconProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      aria-hidden
      style={{
        position: "absolute",
        top,
        left,
        right,
        bottom,
        width: size,
        height: size,
        rotate,
        y: reduce ? 0 : y,
        opacity,
      }}
      className={cn("will-change-transform", className)}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={
        reduce
          ? { scale: 1, opacity }
          : {
              scale: 1,
              opacity,
              translateY: [0, -14, 0],
            }
      }
      transition={
        reduce
          ? { duration: 0.4 }
          : {
              scale: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
              opacity: { duration: 0.6 },
              translateY: {
                duration: floatDuration,
                delay: floatDelay,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }
      }
    >
      {children}
    </motion.div>
  );
}
