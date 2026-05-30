import type { Metadata, Viewport } from "next";
import { Manrope, Inter, JetBrains_Mono, Unbounded } from "next/font/google";
import localFont from "next/font/local";
import { SolanaProvider } from "@/components/solana/SolanaProvider";
import { CasinoProvider } from "@/context/CasinoProvider";
import ToastProvider from "@/components/shared/ToastProvider";
import "./globals.css";

const display = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// Primary display font for page headings (hero + section titles).
const heading = localFont({
  src: "./fonts/ZenterSPDemo-Black.otf",
  variable: "--font-heading",
  weight: "900",
  display: "swap",
});

// Fallback heading face (covers any glyphs the Zenter SP demo lacks).
const headingFallback = Unbounded({
  variable: "--font-heading-fallback",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

// Absolute base for OG/Twitter image URLs. Prefers an explicit site URL, then
// Vercel's auto-injected production host, then localhost in dev — so the
// `opengraph-image.png` file-convention asset always resolves to a full URL.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const title = "VibeFlip Casino — Verifiable Coin Flip on Solana Devnet";
const description =
  "VibeFlip is a provably-fair coin flip casino running on Solana Devnet. Testnet only — no real money involved. Flip, win, and verify every outcome on-chain.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s · VibeFlip Casino",
  },
  description,
  applicationName: "VibeFlip Casino",
  keywords: [
    "Solana",
    "Devnet",
    "crypto casino",
    "coin flip",
    "provably fair",
    "VibeFlip",
  ],
  openGraph: {
    title: "VibeFlip Casino",
    description: "Verifiable coin-flip casino on Solana Devnet.",
    siteName: "VibeFlip Casino",
    type: "website",
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeFlip Casino",
    description: "Verifiable coin-flip casino on Solana Devnet.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#121212",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} ${heading.variable} ${headingFallback.variable} antialiased`}
      >
        <SolanaProvider>
          <CasinoProvider>{children}</CasinoProvider>
        </SolanaProvider>
        <ToastProvider />
      </body>
    </html>
  );
}
