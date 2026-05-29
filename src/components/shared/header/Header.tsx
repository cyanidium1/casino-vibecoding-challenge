"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Container from "@/components/shared/container/Container";
import MainButton from "@/components/shared/buttons/MainButton";
import StatusBadge from "@/components/shared/StatusBadge";
import { WalletIcon } from "@/components/shared/icons";
import { useCasino } from "@/context/CasinoProvider";
import { shortenAddress } from "@/lib/utils/format";
import { CASINO } from "@/lib/config";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { label: "Play", href: "#play" },
  { label: "History", href: "#history" },
  { label: "Fairness", href: "#fairness" },
];

export default function Header() {
  const { wallet, connecting, connect } = useCasino();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed inset-x-0 top-0 z-50 py-4 lg:py-6"
    >
      <Container className="relative flex h-12 items-center justify-between">
        {/* floating pill that fades in on scroll (homepage header pattern) */}
        <div
          className={cn(
            "absolute inset-x-0 -top-2 -z-10 h-16 rounded-full transition duration-500 ease-in-out",
            scrolled
              ? "bg-black/20 shadow-[inset_0px_2px_16px_rgba(255,255,255,0.18)] backdrop-blur-md"
              : "bg-transparent",
          )}
        />
        <a href="#top" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0899FC,#FF49B8)] font-display text-[18px] font-extrabold text-white shadow-[0_8px_24px_-6px_rgba(248,4,152,0.7)]">
            V
          </div>
          <span className="font-display text-[17px] font-bold uppercase tracking-tight">
            {CASINO.name}
            <span className="text-main-light">Casino</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.href}
              className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/55 transition-colors hover:text-white"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <StatusBadge tone="main">{CASINO.network}</StatusBadge>
          </div>
          {wallet.connected ? (
            <span className="vf-mono inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]" />
              {shortenAddress(wallet.address ?? "", 4)}
            </span>
          ) : (
            <MainButton
              size="sm"
              onClick={connect}
              isLoading={connecting}
              leftIcon={<WalletIcon className="h-4 w-4" />}
            >
              Connect
            </MainButton>
          )}
        </div>
      </Container>
    </motion.header>
  );
}
