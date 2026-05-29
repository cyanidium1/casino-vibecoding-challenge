import type { Variants } from "motion/react";

const EASE = [0.25, 0.1, 0.25, 1] as const;

interface FadeInArgs {
  x?: number;
  y?: number;
  scale?: number;
  delay?: number;
  duration?: number;
  opacity?: number;
}

/** Reusable fade/slide-in factory (adapted from reference animationVariants.ts). */
export const fadeIn = ({
  x = 0,
  y = 0,
  scale = 1,
  delay = 0,
  duration = 0.7,
  opacity = 0,
}: FadeInArgs = {}): Variants => ({
  hidden: {
    opacity,
    transform: `translate3d(${x}px, ${y}px, 0) scale3d(${scale}, ${scale}, 1)`,
  },
  visible: {
    opacity: 1,
    transform: "translate3d(0, 0, 0) scale3d(1, 1, 1)",
    transition: { duration, delay, ease: EASE },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: [0.42, 0, 1, 1] },
  },
});

export const stagger = (staggerChildren = 0.12, delayChildren = 0): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren, delayChildren },
  },
});

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE },
  },
};

/** Default viewport config so sections animate once on scroll into view. */
export const inView = { once: true, amount: 0.2 } as const;
