import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Settings, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GroupTabs } from "@/components/group-tabs";
import { InviteCopyChip } from "@/components/invite-copy-chip";
import { initials, avatarGradient, formatRelative } from "@/lib/utils";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [groupRes, memberCountRes, matchCountRes] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, description, invite_code, created_by, created_at")
      .eq("id", id)
      .single(),
    supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", id),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("group_id", id),
  ]);

  const group = groupRes.data;
  if (!group) notFound();

  const isCreator = group.created_by === user.id;
  const memberCount = memberCountRes.count ?? 0;
  const matchCount = matchCountRes.count ?? 0;

  return (
    <main className="max-w-6xl mx-auto px-5 sm:px-8 pt-6 pb-10">
      {/* Group header */}
      <div className="mb-6 space-y-4">
        {/* Back + Settings */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-fg-muted hover:text-fg transition-colors">
            ← Dashboard
          </Link>
          {isCreator && (
            <Link
              href={`/groups/${id}/settings`}
              className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
            >
              <Settings className="size-4" />
              Settings
            </Link>
          )}
        </div>

        {/* Identity row */}
        <div className="flex items-center gap-4">
          {/* Group avatar */}
          <div
            className="shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center font-display font-bold text-white text-lg shadow-lg"
            style={{ background: avatarGradient(group.name) }}
          >
            {initials(group.name)}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight truncate">
              {group.name}
            </h1>
            {group.description && (
              <p className="text-fg-muted mt-0.5 text-sm">{group.description}</p>
            )}
          </div>
        </div>

        {/* Stats + invite */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-fg-muted">
          <span>{memberCount} {memberCount === 1 ? "player" : "players"}</span>
          <span className="text-border-strong">·</span>
          <span>{matchCount} {matchCount === 1 ? "match" : "matches"}</span>
          <span className="text-border-strong">·</span>
          <span>Created {formatRelative(group.created_at)}</span>
          <InviteCopyChip code={group.invite_code} />
        </div>
      </div>

      <GroupTabs groupId={id} />

      <div className="mt-6 pb-24 sm:pb-0">{children}</div>

      {/* Mobile FAB — Log a win */}
      <Link
        href={`/groups/${id}/log`}
        className="fixed right-6 z-40 sm:hidden flex h-14 w-14 items-center justify-center rounded-full bg-accent shadow-lg shadow-accent/30 transition-transform active:scale-95"
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        aria-label="Log a win"
      >
        <Plus className="size-7 text-black" />
      </Link>
    </main>
  );
}
