"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import FloatingIconLayer, { type FloatingIconSpec } from "./FloatingIconLayer";
import {
  CodeGlyph,
  DollarGlyph,
  CoinGlyph,
  ChipGlyph,
  DiamondGlyph,
  SolanaGlyph,
  ChartGlyph,
  BlobGlyph,
} from "./decor-icons";

/* ---- icon layers, ordered by depth (slow = far, fast = near) ---- */

const FAR: FloatingIconSpec[] = [
  { Icon: CodeGlyph, top: "12%", left: "6%", size: 60, opacity: 0.1, rotate: -12, color: "text-blue-light", floatDuration: 11 },
  { Icon: DiamondGlyph, top: "62%", left: "10%", size: 52, opacity: 0.09, rotate: 8, color: "text-main-light", floatDuration: 13, floatDelay: 1.5, hideOnMobile: true },
  { Icon: SolanaGlyph, top: "78%", right: "8%", size: 56, opacity: 0.1, rotate: -6, color: "text-purple-bright", floatDuration: 12, floatDelay: 0.8 },
];

const MID: FloatingIconSpec[] = [
  { Icon: DollarGlyph, top: "22%", right: "12%", size: 66, opacity: 0.13, rotate: 10, color: "text-main-light", floatDuration: 9 },
  { Icon: ChartGlyph, top: "48%", left: "4%", size: 64, opacity: 0.12, rotate: -8, color: "text-blue-bright", floatDuration: 10, floatDelay: 1, hideOnMobile: true },
  { Icon: CoinGlyph, top: "88%", left: "46%", size: 58, opacity: 0.11, rotate: 14, color: "text-blue-light", floatDuration: 8.5, floatDelay: 0.5 },
];

const NEAR: FloatingIconSpec[] = [
  { Icon: ChipGlyph, top: "34%", left: "16%", size: 72, opacity: 0.14, rotate: -10, color: "text-main", floatDuration: 7.5, hideOnMobile: true },
  { Icon: CoinGlyph, top: "6%", right: "22%", size: 50, opacity: 0.14, rotate: 16, color: "text-blue-bright", floatDuration: 8, floatDelay: 0.6 },
  { Icon: CodeGlyph, top: "70%", right: "26%", size: 54, opacity: 0.12, rotate: 6, color: "text-blue-light", floatDuration: 9.5, floatDelay: 1.2, hideOnMobile: true },
];

/**
 * Fixed, full-viewport animated parallax background.
 *
 * Layers (back to front): black base + brand radial wash → drifting blurred
 * glow orbs → soft "drop" blobs → three floating-icon depth layers moving at
 * different scroll speeds. Adapted from the design-reference homepage hero
 * decorations (layered motion.div `y`, blurred glow circles, feGaussianBlur
 * drops) and re-themed for the casino. Movement respects reduced-motion.
 */
export default function AnimatedParallaxBackground() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();

  // Spring-smooth the raw scroll progress so layers glide instead of snapping
  // to each scroll event — removes the "jerky" feel on wheel/trackpad scroll.
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.5,
    restDelta: 0.0005,
  });

  // Depth-mapped scroll movement. Far moves least, near moves most.
  const farY = useTransform(progress, [0, 1], [0, -110]);
  const midY = useTransform(progress, [0, 1], [0, -230]);
  const nearY = useTransform(progress, [0, 1], [0, -380]);

  // Orbs drift gently in the opposite direction for counter-parallax depth.
  const orbPink = useTransform(progress, [0, 1], [0, 190]);
  const orbBlue = useTransform(progress, [0, 1], [0, 130]);
  const orbPurple = useTransform(progress, [0, 1], [0, -150]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black"
    >
      {/* base brand wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(44% 42% at 4% 14%, rgba(38,141,244,0.16), transparent 70%)," +
            "radial-gradient(62% 52% at 50% 118%, rgba(79,93,255,0.14), transparent 70%)",
        }}
      />

      {/* drifting blurred glow orbs */}
      <motion.div
        style={{ y: reduce ? 0 : orbPink }}
        className="absolute -right-24 -top-32 h-[34rem] w-[34rem] rounded-full bg-main/25 blur-[120px]"
      />
      <motion.div
        style={{ y: reduce ? 0 : orbBlue }}
        className="absolute -left-32 top-1/3 h-[30rem] w-[30rem] rounded-full bg-blue/20 blur-[120px]"
      />
      <motion.div
        style={{ y: reduce ? 0 : orbPurple }}
        className="absolute bottom-[-10rem] left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-purple-bright/18 blur-[130px]"
      />

      {/* soft drop blobs (feGaussianBlur SVG) */}
      <motion.div
        style={{ y: reduce ? 0 : midY }}
        className="absolute left-[60%] top-[14%] h-44 w-44 opacity-50"
      >
        <BlobGlyph style={{ width: "100%", height: "100%" }} colorOne="#268df4" colorTwo="#f80498" />
      </motion.div>
      <motion.div
        style={{ y: reduce ? 0 : farY }}
        className="absolute left-[8%] top-[82%] hidden h-40 w-40 opacity-40 sm:block"
      >
        <BlobGlyph style={{ width: "100%", height: "100%" }} colorOne="#4f5dff" colorTwo="#4dd0ff" />
      </motion.div>

      {/* floating icon depth layers */}
      <FloatingIconLayer items={FAR} y={farY} />
      <FloatingIconLayer items={MID} y={midY} />
      <FloatingIconLayer items={NEAR} y={nearY} />

      {/* subtle vignette to protect foreground legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}
