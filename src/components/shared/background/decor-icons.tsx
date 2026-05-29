import type { SVGProps } from "react";

/**
 * Decorative line icons for the animated parallax background.
 * Recreated as inline SVGs (no assets imported from the design reference).
 * They echo the homepage's "code / finance / abstract" decorative language,
 * re-themed for a crypto coin-flip casino: code, dollar, coin, chip, diamond,
 * a Solana-style mark, and a candlestick chart.
 */

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function CodeGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <g {...base}>
        <path d="M17 15 7 24l10 9" />
        <path d="M31 15l10 9-10 9" />
        <path d="M27 11 21 37" />
      </g>
    </svg>
  );
}

export function DollarGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <g {...base}>
        <circle cx="24" cy="24" r="17" />
        <path d="M24 13v22" />
        <path d="M29 18.5c0-2.5-2.2-4-5-4s-5 1.6-5 4.2c0 5.8 10 3.2 10 9.2 0 2.8-2.4 4.4-5 4.4s-5-1.5-5-4.2" />
      </g>
    </svg>
  );
}

export function CoinGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <g {...base}>
        <ellipse cx="24" cy="24" rx="16" ry="16" />
        <ellipse cx="24" cy="24" rx="10.5" ry="10.5" opacity="0.6" />
        <path d="M24 18v12M20.5 21h5.2c1.4 0 2.5 1 2.5 2.4s-1.1 2.4-2.5 2.4H20.5" opacity="0.8" />
      </g>
    </svg>
  );
}

export function ChipGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <g {...base}>
        <circle cx="24" cy="24" r="17" />
        <circle cx="24" cy="24" r="9" />
        <path d="M24 7v6M24 35v6M7 24h6M35 24h6M12 12l4.3 4.3M31.7 31.7 36 36M36 12l-4.3 4.3M16.3 31.7 12 36" />
      </g>
    </svg>
  );
}

export function DiamondGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <g {...base}>
        <path d="M14 9h20l8 11-18 19L6 20z" />
        <path d="M6 20h36M14 9l4 11M34 9l-4 11M18 20l6 19M30 20l-6 19" opacity="0.7" />
      </g>
    </svg>
  );
}

/** Abstract three-bar mark in the spirit of the Solana logo (re-drawn, not copied). */
export function SolanaGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <g {...base}>
        <path d="M13 14h22l-5 5H8z" />
        <path d="M13 24h22l-5 5H8z" opacity="0.8" />
        <path d="M13 34h22l-5-5H8z" opacity="0.6" />
      </g>
    </svg>
  );
}

export function ChartGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <g {...base}>
        <path d="M7 40h34" />
        <path d="M13 34V21M13 16v-3M13 44v-2" opacity="0.85" />
        <rect x="10" y="21" width="6" height="13" rx="1.5" />
        <path d="M23 34V14M23 9V6M23 40v-2" opacity="0.85" />
        <rect x="20" y="14" width="6" height="20" rx="1.5" />
        <path d="M33 34V26M33 21v-3M33 40v-2" opacity="0.85" />
        <rect x="30" y="26" width="6" height="8" rx="1.5" />
      </g>
    </svg>
  );
}

/** Soft blurred ellipse blob — the homepage "drops" decorative shape, re-themed. */
export function BlobGlyph({
  colorOne = "#268df4",
  colorTwo = "#f80498",
  ...props
}: IconProps & { colorOne?: string; colorTwo?: string }) {
  return (
    <svg viewBox="0 0 160 140" fill="none" {...props}>
      <g filter="url(#vf-blob-a)">
        <ellipse cx="60" cy="58" rx="34" ry="10" transform="rotate(-38 60 58)" fill={colorOne} />
      </g>
      <g filter="url(#vf-blob-b)">
        <ellipse cx="104" cy="86" rx="22" ry="7" transform="rotate(-38 104 86)" fill={colorTwo} />
      </g>
      <defs>
        <filter id="vf-blob-a" x="0" y="0" width="160" height="140" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="13" />
        </filter>
        <filter id="vf-blob-b" x="40" y="40" width="120" height="100" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="11" />
        </filter>
      </defs>
    </svg>
  );
}
