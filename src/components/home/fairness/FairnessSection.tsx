"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Container from "@/components/shared/container/Container";
import SectionHeading from "@/components/shared/SectionHeading";
import { CopyIcon, CheckIcon, ArrowUpRight } from "@/components/shared/icons";
import { useCasino } from "@/context/CasinoProvider";
import { fadeIn, inView, stagger, staggerItem } from "@/lib/animations/variants";
import { ONCHAIN, explorerAddress, explorerTx } from "@/lib/config";
import { shortenAddress } from "@/lib/utils/format";

const PILLARS = [
  {
    n: "01",
    title: "On-chain transparency",
    body: "Every flip, deposit, and payout is a real Solana transaction. Nothing is hidden in a backend you can't see.",
  },
  {
    n: "02",
    title: "Verifiable randomness",
    body: "Outcomes are derived from a provably-fair seed committed before your bet — no after-the-fact tampering.",
  },
  {
    n: "03",
    title: "Smart-contract logic",
    body: "Game rules and payouts live in an audited program. The 2% edge is fixed in code, not adjustable behind the scenes.",
  },
  {
    n: "04",
    title: "Explorer verification",
    body: "One click takes any result to Solana Explorer, so you can confirm the math yourself, anytime.",
  },
];

export default function FairnessSection() {
  const { bets } = useCasino();
  const lastTx = bets[0]?.signature;

  return (
    <section id="fairness" className="relative z-[2] py-24 lg:py-32">
      <Container>
        <SectionHeading
          eyebrow="Provably Fair"
          index="05 / 06"
          title={
            <>
              Don&apos;t trust us. <span className="vf-grad-text">Verify it.</span>
            </>
          }
          description="VibeFlip is built so you never have to take our word for anything. The house edge, the odds, and every outcome are all on-chain and open to inspection."
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* pillars */}
          <motion.ul
            initial="hidden"
            whileInView="visible"
            viewport={inView}
            variants={stagger(0.1)}
            className="grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] sm:grid-cols-2"
          >
            {PILLARS.map((p) => (
              <motion.li
                key={p.n}
                variants={staggerItem}
                className="group bg-black/40 p-6 transition-colors hover:bg-white/[0.03]"
              >
                <span className="font-display text-[40px] font-extrabold leading-none vf-grad-text">
                  {p.n}
                </span>
                <h3 className="mt-4 font-display text-[17px] font-bold tracking-tight text-white">
                  {p.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/50">
                  {p.body}
                </p>
              </motion.li>
            ))}
          </motion.ul>

          {/* on-chain details */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={inView}
            variants={fadeIn({ y: 24, delay: 0.1 })}
            className="vf-card flex flex-col p-6"
          >
            <div className="flex items-center justify-between">
              <span className="vf-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                On-chain details
              </span>
              <span className="vf-mono inline-flex items-center gap-1.5 text-[11px] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]" />
                Devnet
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <AddressRow
                label="Program ID"
                value={ONCHAIN.programId}
                href={explorerAddress(ONCHAIN.programId)}
              />
              <AddressRow
                label="Vault Address"
                value={ONCHAIN.vaultAddress}
                href={explorerAddress(ONCHAIN.vaultAddress)}
              />
              <AddressRow
                label="Last Transaction"
                value={lastTx ?? "—"}
                href={lastTx ? explorerTx(lastTx) : undefined}
              />
            </div>

            <a
              href={explorerAddress(ONCHAIN.programId)}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-auto flex items-center justify-between rounded-2xl border border-main/25 bg-main/[0.07] px-4 py-3.5 transition-colors hover:bg-main/[0.12]"
            >
              <span className="text-[13px] font-medium text-white">
                Open program on Solana Explorer
              </span>
              <ArrowUpRight className="h-4 w-4 text-main-light transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

function AddressRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const [copied, setCopied] = useState(false);
  const isReal = value !== "—";

  const copy = async () => {
    if (!isReal) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
      <div className="vf-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
        {label}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <span className="vf-mono text-[13px] text-white/80">
          {isReal ? shortenAddress(value, 6) : "—"}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={copy}
            disabled={!isReal}
            aria-label={`Copy ${label}`}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
          >
            {copied ? (
              <CheckIcon className="h-3.5 w-3.5 text-success" />
            ) : (
              <CopyIcon className="h-3.5 w-3.5" />
            )}
          </button>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${label} on explorer`}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.06] hover:text-main-light"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
