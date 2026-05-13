import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Trophy, Flame, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { GroupCard } from "@/components/group-card";
import type { Group, LeaderboardRow } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Groups the user belongs to
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name, description, invite_code, created_by, created_at)")
    .eq("user_id", user.id);

  const groups: Group[] =
    (memberships
      ?.map((m) => m.groups as unknown as Group)
      .filter(Boolean) as Group[]) ?? [];

  // Cross-group quick stats
  let totalWins = 0;
  let bestStreakAcrossGroups = 0;
  let currentStreakAcrossGroups = 0;
  for (const g of groups) {
    const { data } = await supabase.rpc("get_leaderboard", {
      group_uuid: g.id,
    });
    const me = (data as LeaderboardRow[] | null)?.find(
      (r) => r.player_id === user.id,
    );
    if (me) {
      totalWins += me.wins;
      bestStreakAcrossGroups = Math.max(bestStreakAcrossGroups, me.best_streak);
      currentStreakAcrossGroups = Math.max(currentStreakAcrossGroups, me.current_streak);
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Your groups
          </h1>
          <p className="text-fg-muted mt-1">
            Pick a group to log a win or check the leaderboard.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/groups/join">
            <Button variant="secondary">Join with code</Button>
          </Link>
          <Link href="/groups/new">
            <Button>
              <Plus className="size-4" />
              New group
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        <StatTile
          icon={<Trophy className="size-5" />}
          label="Total wins"
          value={totalWins}
        />
        <StatTile
          icon={<Flame className="size-5 text-[color:var(--color-fire)]" />}
          label="Current streak"
          value={currentStreakAcrossGroups}
          subLabel={bestStreakAcrossGroups > 0 ? `best: ${bestStreakAcrossGroups}` : undefined}
        />
        <StatTile
          label="Groups"
          icon={<ArrowRight className="size-5" />}
          value={groups.length}
        />
      </div>

      {groups.length === 0 ? (
        <EmptyGroups />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </div>
      )}
    </main>
  );
}

function StatTile({
  icon,
  label,
  value,
  subLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 text-fg-muted">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight">
        {value}
      </p>
      {subLabel && (
        <p className="mt-1 text-xs text-fg-subtle">{subLabel}</p>
      )}
    </div>
  );
}

function EmptyGroups() {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-card/40 p-10 text-center">
      <h3 className="font-display text-xl font-semibold">No groups yet</h3>
      <p className="text-fg-muted mt-1 max-w-md mx-auto">
        Spin up a new group and share the invite code with the homies, or join
        one that someone already created.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/groups/join">
          <Button variant="secondary">Join with code</Button>
        </Link>
        <Link href="/groups/new">
          <Button>Create a group</Button>
        </Link>
      </div>
    </div>
  );
}
