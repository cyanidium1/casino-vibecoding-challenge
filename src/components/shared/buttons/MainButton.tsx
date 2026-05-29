import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "@/components/shared/icons";

type Variant = "primary" | "blue" | "ghost" | "outline" | "success" | "danger";
type Size = "sm" | "md" | "lg";

interface MainButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "text-white bg-[linear-gradient(90deg,#0899FC_0%,#FF49B8_116.67%)] shadow-[0_10px_30px_-8px_rgba(248,4,152,0.55)]",
  blue: "text-white bg-blue shadow-[0_10px_30px_-8px_rgba(38,141,244,0.55)]",
  success:
    "text-white bg-[linear-gradient(110deg,#1e9e5a_0%,#3ddc84_100%)] shadow-[0_10px_30px_-8px_rgba(61,220,132,0.5)]",
  danger:
    "text-white bg-[linear-gradient(110deg,#c01e3c_0%,#ff4d6d_100%)] shadow-[0_10px_30px_-8px_rgba(255,77,109,0.5)]",
  ghost: "text-ink bg-white/[0.04] border border-white/10 hover:bg-white/[0.08]",
  outline:
    "text-ink bg-transparent border border-white/15 hover:border-main-light/60 hover:bg-white/[0.03]",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-[12px]",
  md: "h-11 px-5 text-[13px]",
  lg: "h-[52px] px-7 text-[14px]",
};

export default function MainButton({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}: MainButtonProps) {
  const hasShimmer = variant === "primary" || variant === "blue";
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-display font-bold uppercase leading-none tracking-[0.06em] outline-none transition-[transform,opacity,box-shadow] duration-300",
        "focus-visible:ring-2 focus-visible:ring-main-light/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        "enabled:cursor-pointer enabled:active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:saturate-50",
        SIZES[size],
        VARIANTS[variant],
        fullWidth && "w-full",
        className,
      )}
    >
      {hasShimmer && (
        <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-[40deg] bg-gradient-to-r from-white/10 via-white/60 to-white/10 opacity-60 transition-transform duration-[800ms] ease-in-out group-enabled:group-hover:translate-x-[500%]" />
      )}
      <span
        className={cn(
          "relative z-[1] inline-flex items-center gap-2",
          isLoading && "opacity-0",
        )}
      >
        {leftIcon}
        {children}
        {rightIcon}
      </span>
      {isLoading && (
        <span className="absolute inset-0 z-[2] flex items-center justify-center">
          <Spinner className="h-[18px] w-[18px]" />
        </span>
      )}
    </button>
  );
}
