"use client";

import type { ComponentType, SVGProps } from "react";
import type { MotionValue } from "motion/react";
import ParallaxIcon from "./ParallaxIcon";

export interface FloatingIconSpec {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  size?: number;
  opacity?: number;
  rotate?: number;
  /** Tailwind text color class — drives the glyph color via currentColor. */
  color: string;
  floatDuration?: number;
  floatDelay?: number;
  /** Hide on small screens to keep mobile light + readable. */
  hideOnMobile?: boolean;
}

interface FloatingIconLayerProps {
  items: FloatingIconSpec[];
  /** Shared scroll-linked movement for every icon in this depth layer. */
  y: MotionValue<number>;
}

/**
 * One parallax depth: a set of decorative glyphs that all drift at the same
 * scroll speed. Compose several layers at different speeds for depth.
 */
export default function FloatingIconLayer({ items, y }: FloatingIconLayerProps) {
  return (
    <>
      {items.map((it, i) => (
        <ParallaxIcon
          key={i}
          y={y}
          top={it.top}
          left={it.left}
          right={it.right}
          bottom={it.bottom}
          size={it.size}
          opacity={it.opacity}
          rotate={it.rotate}
          floatDuration={it.floatDuration}
          floatDelay={it.floatDelay}
          className={`${it.color} ${it.hideOnMobile ? "hidden sm:block" : ""}`}
        >
          <it.Icon style={{ width: "100%", height: "100%" }} />
        </ParallaxIcon>
      ))}
    </>
  );
}
