import { History } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import type { MatchWithProfiles } from "@/lib/types";

export function RecentMatches({ matches }: { matches: MatchWithProfiles[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-border flex items-center gap-2">
        <History className="size-4 text-fg-muted" />
        <h2 className="font-display text-base font-semibold">Recent matches</h2>
      </div>
      {matches.length === 0 ? (
        <div className="p-6 text-sm text-fg-muted text-center">
          No matches logged yet.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {matches.map((m) => (
            <li key={m.id} className="p-4 sm:p-5">
              <MatchCard match={m} compact />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
