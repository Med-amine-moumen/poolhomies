"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StreakBadge } from "@/components/streak-badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { LeaderboardRow } from "@/lib/types";

interface Props {
  groupId: string;
  rows: LeaderboardRow[];
  currentUserId: string;
}

function sortRows(rows: LeaderboardRow[]): LeaderboardRow[] {
  return [...rows].sort(
    (a, b) =>
      Number(b.wins) - Number(a.wins) ||
      Number(a.losses) - Number(b.losses) ||
      a.display_name.localeCompare(b.display_name),
  );
}

interface PodiumCardProps {
  row: LeaderboardRow;
  rank: 1 | 2 | 3;
  isCurrentUser: boolean;
}

function PodiumCard({ row, rank, isCurrentUser }: PodiumCardProps) {
  const styles = {
    1: {
      border: "border-accent/60",
      bg: "bg-accent/10",
      text: "text-accent",
      label: "Champion",
      delay: 0,
    },
    2: {
      border: "border-[#C0C0C0]/40",
      bg: "bg-white/5",
      text: "text-fg-muted",
      label: "2nd",
      delay: 0.1,
    },
    3: {
      border: "border-[#CD7F32]/40",
      bg: "bg-orange-900/10",
      text: "text-orange-400/80",
      label: "3rd",
      delay: 0.1,
    },
  }[rank];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: styles.delay, duration: 0.35, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border p-3 sm:p-4 text-center",
        "w-24 sm:w-28",
        rank === 1 ? "pt-5 pb-4" : "pt-3 pb-3",
        styles.border,
        styles.bg,
        isCurrentUser && "ring-1 ring-accent/30",
      )}
    >
      {rank === 1 ? (
        <Crown className="size-4 text-accent mb-0.5" />
      ) : (
        <span className={cn("text-xs font-bold", styles.text)}>#{rank}</span>
      )}
      <Avatar
        src={row.avatar_url}
        name={row.display_name}
        size={rank === 1 ? "md" : "sm"}
        champion={rank === 1}
      />
      <div className="text-xs font-semibold truncate w-full max-w-[80px]">
        {row.display_name}
        {isCurrentUser && <span className="text-fg-subtle ml-1">(you)</span>}
      </div>
      <div className={cn("font-display text-lg font-bold", styles.text)}>
        {row.wins}W
      </div>
      <StreakBadge current={row.current_streak} best={row.best_streak} />
    </motion.div>
  );
}

export function Leaderboard({ groupId, rows: initialRows, currentUserId }: Props) {
  const [rows, setRows] = useState(sortRows(initialRows));

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`group-${groupId}-matches`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
          filter: `group_id=eq.${groupId}`,
        },
        async () => {
          const { data } = await supabase.rpc("get_leaderboard", {
            group_uuid: groupId,
          });
          if (data) {
            setRows(sortRows(data as LeaderboardRow[]));
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [groupId]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-card/40 p-10 text-center">
        <Trophy className="size-8 mx-auto text-fg-subtle" />
        <h3 className="mt-3 font-display text-xl font-semibold">No matches yet</h3>
        <p className="text-fg-muted mt-1 max-w-md mx-auto">
          Once anyone logs a win, the leaderboard fills up here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden"
      style={{ background: "rgba(6,22,13,0.7)", backdropFilter: "blur(16px)" }}>
      {/* Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Trophy className="size-5 text-accent" />
          Leaderboard
        </h2>
        <span className="text-xs text-fg-subtle">
          {rows.length} {rows.length === 1 ? "player" : "players"}
        </span>
      </div>

      {/* Podium — show top 3 if there are at least 2 players */}
      {rows.length >= 2 && (
        <div className="px-4 py-5 border-b border-border">
          <div className="flex items-end justify-center gap-2 sm:gap-3">
            {rows[1] && (
              <PodiumCard row={rows[1]} rank={2} isCurrentUser={rows[1].player_id === currentUserId} />
            )}
            <PodiumCard row={rows[0]} rank={1} isCurrentUser={rows[0].player_id === currentUserId} />
            {rows[2] && (
              <PodiumCard row={rows[2]} rank={3} isCurrentUser={rows[2].player_id === currentUserId} />
            )}
          </div>
        </div>
      )}

      {/* Table header */}
      <div className="hidden sm:grid grid-cols-[36px_1fr_52px_52px_140px_120px] gap-2 px-5 sm:px-6 py-2.5 text-[10px] uppercase tracking-widest text-fg-subtle border-b border-border">
        <div>#</div>
        <div>Player</div>
        <div className="text-right">W</div>
        <div className="text-right">L</div>
        <div className="text-right">Win %</div>
        <div className="text-right">Streak</div>
      </div>

      {/* Rows */}
      <ol className="divide-y divide-border">
        <AnimatePresence initial={false}>
          {rows.map((row, idx) => (
            <motion.li
              key={row.player_id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.22 }}
              className={cn(
                "grid grid-cols-[36px_1fr_52px_52px_140px_120px] gap-2 px-5 sm:px-6 py-3 items-center",
                "group transition-colors duration-150",
                "hover:bg-white/[0.04]",
                idx === 0
                  ? "border-l-2 border-l-accent bg-accent/5"
                  : "border-l-2 border-l-transparent",
                row.player_id === currentUserId && "bg-accent/[0.07]",
              )}
            >
              {/* Rank */}
              <div className={cn("font-display font-bold text-sm", idx === 0 ? "text-accent" : "text-fg-subtle")}>
                {idx + 1}
              </div>

              {/* Player */}
              <div className="min-w-0 flex items-center gap-2.5">
                <Avatar
                  src={row.avatar_url}
                  name={row.display_name}
                  size="sm"
                  champion={idx === 0}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {row.display_name}
                    {row.player_id === currentUserId && (
                      <span className="ml-1.5 text-xs text-fg-subtle">(you)</span>
                    )}
                  </div>
                  {/* Mobile stats */}
                  <div className="sm:hidden text-xs text-fg-muted mt-0.5 font-mono tabular-nums">
                    {row.wins}W · {row.losses}L · {row.win_pct}%
                  </div>
                </div>
              </div>

              {/* W */}
              <div className="hidden sm:block text-right font-mono tabular-nums text-sm font-semibold">
                {row.wins}
              </div>

              {/* L */}
              <div className="hidden sm:block text-right font-mono tabular-nums text-sm text-fg-muted">
                {row.losses}
              </div>

              {/* Win % bar */}
              <div className="hidden sm:flex items-center gap-2 justify-end">
                <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${row.win_pct}%` }}
                  />
                </div>
                <span className="font-mono tabular-nums text-xs w-9 text-right">
                  {row.win_pct}%
                </span>
              </div>

              {/* Streak */}
              <div className="flex justify-end">
                <StreakBadge current={row.current_streak} best={row.best_streak} />
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  );
}
