import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  if (amount === 0) return "$0.00";
  if (amount < 0.01) return `$${amount.toFixed(6)}`;
  return `$${amount.toFixed(4)}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function truncate(text: string, max = 48): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

/** Maps low-level provider/HTTP errors into short, human-friendly copy. Never leak stack traces or secrets. */
export function humanizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("invalid api key")) {
    return "Your API key appears invalid. Please verify it and try again.";
  }
  if (lower.includes("429") || lower.includes("rate limit")) {
    return "You're sending requests a little too fast. Please wait a moment and try again.";
  }
  if (lower.includes("insufficient") || lower.includes("credit")) {
    return "You're out of credits. Add more to keep researching.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "The request took too long to respond. Please try again.";
  }
  if (lower.includes("network") || lower.includes("fetch failed") || lower.includes("econnrefused")) {
    return "We couldn't reach the model provider. Check your endpoint URL and try again.";
  }
  if (lower.includes("404") || lower.includes("not found")) {
    return "That model or endpoint couldn't be found. Please double-check your settings.";
  }
  return "Something went wrong on our end. Please try again in a moment.";
}
