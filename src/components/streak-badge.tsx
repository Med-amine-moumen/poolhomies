import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  current: number;
  best: number;
}

export function StreakBadge({ current, best }: Props) {
  if (current >= 3) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
          "border border-[color:var(--color-fire)]/40 bg-[color:var(--color-fire)]/15 text-[color:var(--color-fire)]",
        )}
        title={`${current}-win streak (best: ${best})`}
      >
        <Flame className="size-3.5 animate-flicker" />
        <span>{current}</span>
      </div>
    );
  }
  if (current > 0) {
    return (
      <div
        className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent"
        title={`${current}-win streak (best: ${best})`}
      >
        <span className="size-1.5 rounded-full bg-accent" />
        <span>{current}</span>
      </div>
    );
  }
  return (
    <span className="text-xs text-fg-subtle font-mono">
      {best > 0 ? `best ${best}` : "—"}
    </span>
  );
}
