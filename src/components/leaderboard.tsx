"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";
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

export function Leaderboard({ groupId, rows: initialRows, currentUserId }: Props) {
  const [rows, setRows] = useState(initialRows);

  // Subscribe to new matches and refetch the leaderboard via RPC.
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
          if (data) setRows(data as LeaderboardRow[]);
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
        <h3 className="mt-3 font-display text-xl font-semibold">
          No matches yet
        </h3>
        <p className="text-fg-muted mt-1 max-w-md mx-auto">
          Once anyone logs a win, the leaderboard fills up here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Trophy className="size-5 text-accent" />
          Leaderboard
        </h2>
        <span className="text-xs text-fg-subtle">
          {rows.length} {rows.length === 1 ? "player" : "players"}
        </span>
      </div>

      <div className="hidden sm:grid grid-cols-[40px_1fr_60px_60px_80px_120px] gap-2 px-6 py-3 text-xs uppercase tracking-wider text-fg-subtle border-b border-border">
        <div>#</div>
        <div>Player</div>
        <div className="text-right">W</div>
        <div className="text-right">L</div>
        <div className="text-right">Win %</div>
        <div className="text-right">Streak</div>
      </div>

      <ol className="divide-y divide-border">
        <AnimatePresence initial={false}>
          {rows.map((row, idx) => (
            <motion.li
              key={row.player_id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.25 }}
              className={cn(
                "grid grid-cols-[40px_1fr_60px_60px_80px_120px] gap-2 px-6 py-3 items-center",
                row.player_id === currentUserId && "bg-accent-soft/30",
              )}
            >
              <div className="font-display font-bold text-fg-muted">
                {idx === 0 ? (
                  <span className="text-accent">1</span>
                ) : (
                  idx + 1
                )}
              </div>
              <div className="min-w-0 flex items-center gap-3">
                <Avatar
                  src={row.avatar_url}
                  name={row.display_name}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {row.display_name}
                    {row.player_id === currentUserId && (
                      <span className="ml-2 text-xs text-fg-subtle">(you)</span>
                    )}
                  </div>
                  <div className="sm:hidden text-xs text-fg-muted mt-0.5">
                    {row.wins}W · {row.losses}L · {row.win_pct}%
                  </div>
                </div>
              </div>
              <div className="hidden sm:block text-right font-mono tabular-nums">
                {row.wins}
              </div>
              <div className="hidden sm:block text-right font-mono tabular-nums text-fg-muted">
                {row.losses}
              </div>
              <div className="hidden sm:block text-right font-mono tabular-nums">
                {row.win_pct}%
              </div>
              <div className="flex justify-end">
                <StreakBadge
                  current={row.current_streak}
                  best={row.best_streak}
                />
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  );
}
