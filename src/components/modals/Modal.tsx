"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CloseIcon } from "@/components/shared/icons";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
}: ModalProps) {
  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock background scroll while open. On touch devices `overflow:hidden` alone
  // doesn't stop the page scrolling behind the sheet (mobile Safari/Chrome
  // ignore it), so we pin <body> with `position:fixed` and restore the scroll
  // position on close. Desktop keeps the lighter overflow-lock (no layout jump,
  // scrollbar gutter stays reserved).
  useEffect(() => {
    if (!open) return;
    const isTouch =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches;

    if (!isTouch) {
      document.documentElement.classList.add("no-doc-scroll");
      return () => document.documentElement.classList.remove("no-doc-scroll");
    }

    const scrollY = window.scrollY;
    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="vf-card relative z-[1] w-full max-w-[440px] p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-[22px] font-bold uppercase tracking-tight text-white">
                  {title}
                </h3>
                {subtitle && (
                  <p className="mt-1 text-[13px] text-white/50">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
