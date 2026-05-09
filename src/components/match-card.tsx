import { MapPin, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";
import type { MatchWithProfiles } from "@/lib/types";

interface Props {
  match: MatchWithProfiles;
  compact?: boolean;
}

export function MatchCard({ match, compact = false }: Props) {
  return (
    <div className="space-y-2.5">
      {/* Players row */}
      <div className="flex items-center gap-2">
        {/* Winner */}
        <div className="flex-1 flex items-center gap-2 min-w-0 pl-2.5 border-l-2 border-accent">
          <Avatar
            src={match.winner.avatar_url}
            name={match.winner.display_name}
            size="sm"
            champion
          />
          <div className="min-w-0">
            <div className="text-[10px] text-accent font-semibold uppercase tracking-wider flex items-center gap-1">
              <Trophy className="size-2.5" />
              Win
            </div>
            <div className="font-medium text-sm truncate">{match.winner.display_name}</div>
          </div>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center shrink-0 px-1">
          <span className="text-[10px] font-bold text-fg-subtle/60 tracking-widest">VS</span>
        </div>

        {/* Loser */}
        <div className="flex-1 flex items-center gap-2 min-w-0 justify-end pr-2.5 border-r-2 border-white/10">
          <div className="min-w-0 text-right">
            <div className="text-[10px] text-fg-subtle uppercase tracking-wider">Loss</div>
            <div className="font-medium text-sm text-fg-muted truncate">{match.loser.display_name}</div>
          </div>
          <Avatar
            src={match.loser.avatar_url}
            name={match.loser.display_name}
            size="sm"
          />
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {match.game_type && <Badge variant="default">{match.game_type}</Badge>}
          {match.location && (
            <span className="inline-flex items-center gap-1 text-fg-muted">
              <MapPin className="size-3" />
              {match.location}
            </span>
          )}
        </div>
        <span className="text-xs text-fg-subtle whitespace-nowrap shrink-0">
          {formatRelative(match.played_at)}
        </span>
      </div>

      {!compact && match.notes && (
        <p className="text-sm text-fg-muted italic border-l-2 border-border pl-2.5">
          &ldquo;{match.notes}&rdquo;
        </p>
      )}
    </div>
  );
}
