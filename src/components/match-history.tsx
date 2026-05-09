"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MatchCard } from "@/components/match-card";
import { MatchComments } from "@/components/match-comments";
import { deleteMatchAction } from "@/actions/matches";
import type {
  MatchWithProfiles,
  MatchCommentWithProfile,
  Profile,
} from "@/lib/types";

interface Props {
  matches: MatchWithProfiles[];
  members: Pick<Profile, "id" | "display_name" | "avatar_url">[];
  /** All comments for the listed matches, grouped client-side by match_id */
  comments: MatchCommentWithProfile[];
  groupId: string;
  currentUserId: string;
  isAdmin: boolean;
}

export function MatchHistory({
  matches,
  members,
  comments,
  groupId,
  currentUserId,
  isAdmin,
}: Props) {
  const [playerId, setPlayerId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [deletePending, startDelete] = useTransition();

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (playerId !== "all") {
        if (m.winner_id !== playerId && m.loser_id !== playerId) return false;
      }
      const played = new Date(m.played_at).getTime();
      if (from) {
        const start = new Date(from).getTime();
        if (played < start) return false;
      }
      if (to) {
        const end = new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1;
        if (played > end) return false;
      }
      return true;
    });
  }, [matches, playerId, from, to]);

  const commentsByMatch = useMemo(() => {
    const map = new Map<string, MatchCommentWithProfile[]>();
    for (const c of comments) {
      const list = map.get(c.match_id) ?? [];
      list.push(c);
      map.set(c.match_id, list);
    }
    return map;
  }, [comments]);

  function handleDeleteMatch(matchId: string) {
    if (!confirm("Delete this match? This can't be undone.")) return;
    startDelete(async () => {
      const res = await deleteMatchAction(matchId, groupId);
      if (res.error) toast.error(res.error);
      else toast.success("Match deleted");
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="player-filter">Player</Label>
          <Select
            id="player-filter"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
          >
            <option value="all">Everyone</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-card/40 p-10 text-center text-fg-muted">
          No matches match your filters.
        </div>
      ) : (
        <ul className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm divide-y divide-border overflow-hidden">
          {filtered.map((m) => (
            <li key={m.id} className="p-4 sm:p-5">
              <div className="relative">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMatch(m.id)}
                    disabled={deletePending}
                    className="absolute top-0 right-0 inline-flex items-center gap-1 text-xs text-fg-subtle hover:text-danger transition-colors disabled:opacity-50"
                    aria-label="Delete match (admin)"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
                <MatchCard match={m} />
              </div>
              <MatchComments
                matchId={m.id}
                groupId={groupId}
                comments={commentsByMatch.get(m.id) ?? []}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
