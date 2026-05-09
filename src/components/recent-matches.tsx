"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { createClient } from "@/lib/supabase/client";
import type { MatchWithProfiles } from "@/lib/types";

interface Props {
  groupId: string;
  matches: MatchWithProfiles[];
}

export function RecentMatches({ groupId, matches: initialMatches }: Props) {
  const [matches, setMatches] = useState(initialMatches);
  const [newId, setNewId] = useState<string | null>(null);
  const newIdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`recent-matches-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches", filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const { data } = await supabase
            .from("matches")
            .select(
              "id, group_id, winner_id, loser_id, location, game_type, notes, played_at, logged_by, created_at, winner:profiles!matches_winner_id_fkey(id,display_name,avatar_url), loser:profiles!matches_loser_id_fkey(id,display_name,avatar_url)",
            )
            .eq("id", payload.new.id)
            .single();

          if (data) {
            const m = data as unknown as MatchWithProfiles;
            setMatches((prev) => [m, ...prev].slice(0, 8));
            setNewId(m.id);
            if (newIdTimer.current) clearTimeout(newIdTimer.current);
            newIdTimer.current = setTimeout(() => setNewId(null), 5000);
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
      if (newIdTimer.current) clearTimeout(newIdTimer.current);
    };
  }, []);

  return (
    <div
      className="rounded-2xl border border-border overflow-hidden"
      style={{ background: "rgba(6,22,13,0.7)", backdropFilter: "blur(16px)" }}
    >
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <History className="size-4 text-fg-muted" />
        <h2 className="font-display text-base font-semibold">Recent matches</h2>
      </div>

      {matches.length === 0 ? (
        <div className="p-8 text-sm text-fg-muted text-center">
          No matches logged yet.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          <AnimatePresence initial={false}>
            {matches.map((m) => (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="relative p-4"
              >
                {newId === m.id && (
                  <motion.span
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ delay: 3.5, duration: 1 }}
                    className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-widest text-accent bg-accent/15 border border-accent/30 rounded-full px-2 py-0.5"
                  >
                    New
                  </motion.span>
                )}
                <MatchCard match={m} compact />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
