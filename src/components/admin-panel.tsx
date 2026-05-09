"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck, Shield, Trash2, Users, Layers, Swords } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/utils";
import {
  setAdminAction,
  adminDeleteUserAction,
  adminDeleteGroupAction,
  adminDeleteMatchAction,
} from "@/actions/admin";
import type { Profile, Group, MatchWithProfiles } from "@/lib/types";

interface UserRow extends Profile {
  email: string | null;
  group_count: number;
  match_count: number;
}

interface GroupRow extends Group {
  member_count: number;
  match_count: number;
}

interface Props {
  currentUserId: string;
  users: UserRow[];
  groups: GroupRow[];
  recentMatches: MatchWithProfiles[];
}

type Tab = "users" | "groups" | "matches";

export function AdminPanel({
  currentUserId,
  users,
  groups,
  recentMatches,
}: Props) {
  const [tab, setTab] = useState<Tab>("users");
  const [pending, startTransition] = useTransition();

  function toggleAdmin(userId: string, current: boolean) {
    startTransition(async () => {
      const res = await setAdminAction(userId, !current);
      if (res.error) toast.error(res.error);
      else toast.success(current ? "Admin revoked" : "Admin granted");
    });
  }
  function deleteUser(userId: string, name: string) {
    if (!confirm(`Permanently delete ${name}'s account and all their data?`)) return;
    startTransition(async () => {
      const res = await adminDeleteUserAction(userId);
      if (res.error) toast.error(res.error);
      else toast.success("User deleted");
    });
  }
  function deleteGroup(groupId: string, name: string) {
    if (!confirm(`Delete the "${name}" group and all its matches?`)) return;
    startTransition(async () => {
      const res = await adminDeleteGroupAction(groupId);
      if (res.error) toast.error(res.error);
      else toast.success("Group deleted");
    });
  }
  function deleteMatch(matchId: string) {
    if (!confirm("Delete this match?")) return;
    startTransition(async () => {
      const res = await adminDeleteMatchAction(matchId);
      if (res.error) toast.error(res.error);
      else toast.success("Match deleted");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-6 text-accent" />
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Admin
        </h1>
      </div>
      <p className="text-fg-muted -mt-3">
        Manage users, groups, and matches. Be careful — actions here apply
        instantly and most can't be undone.
      </p>

      <div className="rounded-2xl border border-border-strong bg-card/95 backdrop-blur-md shadow-2xl shadow-black/40 overflow-hidden">
        <div className="border-b border-border flex">
          <TabBtn active={tab === "users"} onClick={() => setTab("users")}>
            <Users className="size-4" /> Users ({users.length})
          </TabBtn>
          <TabBtn active={tab === "groups"} onClick={() => setTab("groups")}>
            <Layers className="size-4" /> Groups ({groups.length})
          </TabBtn>
          <TabBtn active={tab === "matches"} onClick={() => setTab("matches")}>
            <Swords className="size-4" /> Matches ({recentMatches.length})
          </TabBtn>
        </div>

        <div className="p-4 sm:p-6">
          {tab === "users" && (
            <ul className="divide-y divide-border">
              {users.map((u) => {
                const isMe = u.id === currentUserId;
                return (
                  <li
                    key={u.id}
                    className="py-3 flex items-center gap-3 flex-wrap"
                  >
                    <Avatar
                      src={u.avatar_url}
                      name={u.display_name}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {u.display_name}
                        </span>
                        {u.is_admin && (
                          <Badge variant="default">
                            <ShieldCheck className="size-3" />
                            Admin
                          </Badge>
                        )}
                        {isMe && (
                          <span className="text-xs text-fg-subtle">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-fg-muted truncate">
                        {u.email ?? "—"} · {u.group_count} group
                        {u.group_count === 1 ? "" : "s"} · {u.match_count} match
                        {u.match_count === 1 ? "" : "es"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={u.is_admin ? "secondary" : "outline"}
                        disabled={pending || isMe}
                        onClick={() => toggleAdmin(u.id, !!u.is_admin)}
                      >
                        {u.is_admin ? (
                          <>
                            <Shield className="size-3.5" />
                            Revoke admin
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="size-3.5" />
                            Make admin
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending || isMe}
                        onClick={() => deleteUser(u.id, u.display_name)}
                        className="text-danger hover:text-danger hover:bg-danger/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {tab === "groups" && (
            <ul className="divide-y divide-border">
              {groups.map((g) => (
                <li
                  key={g.id}
                  className="py-3 flex items-center gap-3 flex-wrap"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{g.name}</div>
                    <div className="text-xs text-fg-muted truncate">
                      <code className="font-mono">{g.invite_code}</code> ·{" "}
                      {g.member_count} member
                      {g.member_count === 1 ? "" : "s"} · {g.match_count}{" "}
                      match
                      {g.match_count === 1 ? "" : "es"} · created{" "}
                      {formatRelative(g.created_at)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => deleteGroup(g.id, g.name)}
                    className="text-danger hover:text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="size-3.5" />
                    Delete group
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {tab === "matches" && (
            <ul className="divide-y divide-border">
              {recentMatches.map((m) => (
                <li
                  key={m.id}
                  className="py-3 flex items-center gap-3 flex-wrap"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-medium">
                        {m.winner.display_name}
                      </span>{" "}
                      <span className="text-fg-muted">beat</span>{" "}
                      <span className="font-medium">
                        {m.loser.display_name}
                      </span>
                    </div>
                    <div className="text-xs text-fg-muted truncate">
                      {m.game_type} ·{" "}
                      {m.location ? `${m.location} · ` : ""}
                      {formatRelative(m.played_at)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => deleteMatch(m.id)}
                    className="text-danger hover:text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
              {recentMatches.length === 0 && (
                <li className="py-6 text-center text-fg-muted">
                  No matches yet.
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-4 py-3 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors border-b-2 ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-fg-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}
