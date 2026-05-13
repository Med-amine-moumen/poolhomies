import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  current: number;
  best: number;
}

export function StreakBadge({ current, best }: Props) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      {current >= 5 ? (
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
            "border border-amber-400/60 bg-amber-500/20 text-amber-300",
            "shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-pulse-glow",
          )}
        >
          <Flame className="size-3.5 animate-flicker" />
          <Flame className="size-3.5 animate-flicker -ml-1.5" />
          <span>{current}</span>
        </div>
      ) : current >= 3 ? (
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            "border border-orange-400/40 bg-orange-500/15 text-orange-300",
            "animate-pulse",
          )}
        >
          <Flame className="size-3.5 animate-flicker" />
          <span>{current}</span>
        </div>
      ) : current > 0 ? (
        <div className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
          <span className="size-1.5 rounded-full bg-accent" />
          <span>{current}</span>
        </div>
      ) : (
        <span className="text-xs text-fg-subtle font-mono">—</span>
      )}

      {best > 0 && (
        <span className="text-[10px] text-fg-subtle font-mono leading-none">
          best {best}
        </span>
      )}
    </div>
  );
}
