"use client";

import { motion } from "motion/react";
import Container from "@/components/shared/container/Container";
import MainButton from "@/components/shared/buttons/MainButton";
import Eyebrow from "@/components/shared/Eyebrow";
import Coin from "@/components/shared/Coin";
import { WalletIcon, ShieldIcon } from "@/components/shared/icons";
import { useCasino } from "@/context/CasinoProvider";
import { useParallax } from "@/hooks/useParallax";
import { fadeIn, stagger, staggerItem } from "@/lib/animations/variants";
import { CASINO } from "@/lib/config";

const FLOATERS = [
  { label: "Provably fair", tone: "good", top: "8%", left: "4%", delay: "vf-delay-0" },
  { label: "0.5s settlement", tone: "mono", top: "70%", left: "0%", delay: "vf-delay-2" },
  { label: "2% house edge", tone: "good", top: "20%", right: "0%", delay: "vf-delay-4" },
] as const;

export default function CasinoHero() {
  const { wallet, connecting, connect } = useCasino();
  const { ref, slow, medium } = useParallax();

  return (
    <section
      ref={ref}
      id="top"
      className="relative z-[2] overflow-hidden pb-20 pt-28 sm:pt-32 lg:pb-28 lg:pt-40"
    >
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          {/* ---- copy column ---- */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger(0.12)}
            className="flex flex-col items-start"
          >
            <motion.div variants={staggerItem}>
              <Eyebrow index="DEVNET">Live on {CASINO.network}</Eyebrow>
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="mt-6 font-display text-[clamp(40px,7vw,76px)] font-extrabold uppercase leading-[0.98] tracking-[-0.03em] text-white"
            >
              Flip the coin.
              <br />
              <span className="vf-grad-text">Verify the win.</span>
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="mt-6 max-w-[46ch] text-[16px] leading-relaxed text-white/60"
            >
              {CASINO.name} is a verifiable coin flip casino on {CASINO.network}.
              Every flip is settled on-chain and auditable in the explorer — pure
              odds, no house tricks.
            </motion.p>

            <motion.div
              variants={staggerItem}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <MainButton
                size="lg"
                variant="primary"
                onClick={connect}
                isLoading={connecting}
                leftIcon={<WalletIcon className="h-[18px] w-[18px]" />}
              >
                {wallet.connected ? "Wallet Connected" : "Connect Wallet"}
              </MainButton>
              <MainButton
                size="lg"
                variant="outline"
                onClick={() =>
                  document
                    .getElementById("fairness")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                leftIcon={<ShieldIcon className="h-[18px] w-[18px]" />}
              >
                View Fairness
              </MainButton>
            </motion.div>

            <motion.div
              variants={staggerItem}
              className="mt-7 flex items-center gap-3 text-[12px] text-white/40"
            >
              <span className="vf-mono rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
                TESTNET ONLY
              </span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>No real money involved — devnet tokens only.</span>
            </motion.div>
          </motion.div>

          {/* ---- coin column ---- */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative mx-auto flex h-[340px] w-full max-w-[440px] items-center justify-center sm:h-[420px]"
          >
            <motion.div style={{ y: medium }}>
              <Coin ambient size={300} />
            </motion.div>

            {/* parallax floating tags */}
            <motion.div style={{ y: slow }} className="pointer-events-none absolute inset-0">
              {FLOATERS.map((f) => (
                <span
                  key={f.label}
                  className={`vf-tag ${f.delay} absolute`}
                  style={{
                    top: f.top,
                    left: "left" in f ? f.left : undefined,
                    right: "right" in f ? f.right : undefined,
                  }}
                >
                  <span
                    className="vf-dot"
                    style={
                      f.tone === "mono"
                        ? { background: "#6b7280", boxShadow: "none" }
                        : undefined
                    }
                  />
                  <span className={f.tone === "mono" ? "vf-mono text-[10px]" : ""}>
                    {f.label}
                  </span>
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* trust strip */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeIn({ y: 20, delay: 0.1 })}
          className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] sm:grid-cols-4"
        >
          {[
            { k: "Total flips", v: "128,402" },
            { k: "VIBE wagered", v: "4.2M" },
            { k: "Avg. settlement", v: "0.5s" },
            { k: "House edge", v: "2.0%" },
          ].map((s) => (
            <div key={s.k} className="bg-black/40 px-5 py-5">
              <div className="font-display text-[22px] font-bold tracking-tight text-white">
                {s.v}
              </div>
              <div className="vf-mono mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">
                {s.k}
              </div>
            </div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
