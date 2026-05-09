"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { formatRelative } from "@/lib/utils";
import type { H2HResult, Profile } from "@/lib/types";

interface Props {
  groupId: string;
  members: Pick<Profile, "id" | "display_name" | "avatar_url">[];
  currentUserId: string;
}

export function H2HComparison({ groupId, members, currentUserId }: Props) {
  const [aId, setAId] = useState(currentUserId);
  const [bId, setBId] = useState(
    members.find((m) => m.id !== currentUserId)?.id ?? "",
  );
  const [result, setResult] = useState<H2HResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!aId || !bId || aId === bId) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase
      .rpc("get_h2h", {
        group_uuid: groupId,
        player_a: aId,
        player_b: bId,
      })
      .then(({ data }) => {
        if (cancelled) return;
        const row = (data as H2HResult[] | null)?.[0] ?? null;
        setResult(row);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [aId, bId, groupId]);

  const playerA = members.find((m) => m.id === aId);
  const playerB = members.find((m) => m.id === bId);
  const total = result?.total ?? 0;
  const aPct = total > 0 ? (result!.a_wins / total) * 100 : 50;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="a">Player A</Label>
          <Select id="a" value={aId} onChange={(e) => setAId(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b">Player B</Label>
          <Select id="b" value={bId} onChange={(e) => setBId(e.target.value)}>
            <option value="" disabled>
              Pick a player
            </option>
            {members
              .filter((m) => m.id !== aId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
          </Select>
        </div>
      </div>

      {!playerA || !playerB || aId === bId ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-card/40 p-8 text-center text-fg-muted">
          Pick two different players to see their head-to-head record.
        </div>
      ) : loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : (
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                src={playerA.avatar_url}
                name={playerA.display_name}
                size="lg"
              />
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-fg-subtle">
                  Player A
                </div>
                <div className="font-display font-semibold truncate">
                  {playerA.display_name}
                </div>
              </div>
            </div>
            <div className="text-fg-subtle font-display text-2xl">vs</div>
            <div className="flex items-center gap-3 min-w-0 flex-row-reverse text-right">
              <Avatar
                src={playerB.avatar_url}
                name={playerB.display_name}
                size="lg"
              />
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-fg-subtle">
                  Player B
                </div>
                <div className="font-display font-semibold truncate">
                  {playerB.display_name}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-4 mb-3">
            <span className="font-display text-5xl font-bold text-accent">
              {result?.a_wins ?? 0}
            </span>
            <span className="text-fg-subtle text-sm">
              {total} {total === 1 ? "match" : "matches"}
            </span>
            <span className="font-display text-5xl font-bold text-fg-muted">
              {result?.b_wins ?? 0}
            </span>
          </div>

          <div className="h-3 rounded-full bg-bg-elev overflow-hidden flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${aPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-accent"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${100 - aPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-white/15"
            />
          </div>

          {result?.last_match && (
            <p className="text-xs text-fg-subtle mt-4 text-center">
              Last match {formatRelative(result.last_match)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
