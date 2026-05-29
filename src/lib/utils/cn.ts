import { twMerge } from "tailwind-merge";

export type ClassValue = string | number | null | false | undefined;

/** Merge Tailwind classes while resolving conflicts (adapted from reference twMerge usage). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(
    inputs
      .filter((v): v is string | number => Boolean(v) || v === 0)
      .join(" "),
  );
}
