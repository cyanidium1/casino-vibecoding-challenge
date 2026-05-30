"use client";

import { Toaster } from "sonner";

/**
 * Global toast surface, styled to match the dark-neon casino UI.
 * Bottom-right on desktop; sonner stacks full-width on mobile automatically.
 */
export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      theme="dark"
      richColors
      closeButton
      gap={10}
      offset={16}
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
