"use client";

import { useRef } from "react";
import { useScroll, useTransform, type MotionValue } from "motion/react";

/**
 * Scroll-linked parallax (adapted from reference useParallaxScroll).
 * Returns a ref to attach to the tracked section plus a set of MotionValues
 * mapped to different depths, so layers move at different speeds.
 */
export function useParallax() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const slow: MotionValue<number> = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const medium: MotionValue<number> = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const fast: MotionValue<number> = useTransform(scrollYProgress, [0, 1], [140, -140]);

  return { ref, scrollYProgress, slow, medium, fast };
}
