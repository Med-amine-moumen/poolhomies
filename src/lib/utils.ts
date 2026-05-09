import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

/**
 * Generate an invite code in the form RACK-XXXX (kept the RACK- prefix from
 * the original spec — easy to recognize when shared). 4 chars from a 32-char
 * alphabet => ~1M codes; uniqueness is enforced by the DB constraint.
 */
export function generateInviteCode(): string {
  let body = "";
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < bytes.length; i++) {
    body += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `RACK-${body}`;
}

export function formatRelative(date: string | Date): string {
  // Lightweight relative formatter — used for match timestamps. We deliberately
  // avoid pulling all of date-fns into client bundles for this tiny helper.
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const GRADIENT_PAIRS: [string, string][] = [
  ["#f5cf5b", "#d97706"], // gold / amber  — matches accent
  ["#10b981", "#14b8a6"], // emerald / teal
  ["#06b6d4", "#3b82f6"], // cyan / blue
  ["#22c55e", "#16a34a"], // green / dark-green
  ["#f97316", "#ea580c"], // orange / deep-orange
  ["#84cc16", "#4ade80"], // lime / light-green
];

export function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const [a, b] = GRADIENT_PAIRS[Math.abs(hash) % GRADIENT_PAIRS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}
