"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import Eyebrow from "@/components/shared/Eyebrow";
import { fadeIn, inView } from "@/lib/animations/variants";
import { cn } from "@/lib/utils/cn";

interface SectionHeadingProps {
  eyebrow: string;
  index?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

export default function SectionHeading({
  eyebrow,
  index,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={inView}
      variants={fadeIn({ y: 24 })}
      className={cn(
        "flex flex-col gap-5",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <Eyebrow index={index}>{eyebrow}</Eyebrow>
      <h2 className="max-w-[18ch] font-display text-[clamp(30px,4.4vw,52px)] font-bold uppercase leading-[1.02] tracking-[-0.025em] text-white text-balance">
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "max-w-[52ch] text-[15px] leading-relaxed text-white/55",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      )}
    </motion.div>
  );
}
