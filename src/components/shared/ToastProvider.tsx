"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

/**
 * Global toast surface, styled to match the dark-neon casino UI.
 *
 * Desktop: bottom-right. Mobile (≤640px): top-center, clear of the safe-area
 * inset — so toasts never sit on top of the bottom-sheet modals (wallet /
 * deposit / withdraw) the way bottom-anchored toasts did.
 */
export default function ToastProvider() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <Toaster
      position={isMobile ? "top-center" : "bottom-right"}
      theme="dark"
      richColors
      closeButton
      gap={10}
      offset={
        isMobile ? "calc(env(safe-area-inset-top, 0px) + 14px)" : 16
      }
      toastOptions={{
        style: {
          fontFamily: "var(--font-body)",
          borderRadius: "14px",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        },
        classNames: {
          toast: "vf-toast",
          title: "vf-toast-title",
          description: "vf-toast-desc",
          actionButton: "vf-toast-action",
          closeButton: "vf-toast-close",
        },
      }}
    />
  );
}
