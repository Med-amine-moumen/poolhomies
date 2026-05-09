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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            src={match.winner.avatar_url}
            name={match.winner.display_name}
            size={compact ? "sm" : "md"}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Trophy className="size-3.5 text-accent shrink-0" />
              <span className="font-medium truncate">
                {match.winner.display_name}
              </span>
            </div>
            <div className="text-xs text-fg-muted truncate">
              beat {match.loser.display_name}
            </div>
          </div>
        </div>
        <span className="text-xs text-fg-subtle whitespace-nowrap shrink-0">
          {formatRelative(match.played_at)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {match.game_type && (
          <Badge variant="default">{match.game_type}</Badge>
        )}
        {match.location && (
          <span className="inline-flex items-center gap-1 text-fg-muted">
            <MapPin className="size-3" />
            {match.location}
          </span>
        )}
      </div>

      {!compact && match.notes && (
        <p className="text-sm text-fg-muted italic">&ldquo;{match.notes}&rdquo;</p>
      )}
    </div>
  );
}
