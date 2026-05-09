"use client";

import { useActionState, useState, useTransition } from "react";
import { Copy, RefreshCw, UserMinus, Check } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  updateGroupAction,
  regenerateInviteCodeAction,
  removeMemberAction,
} from "@/actions/groups";
import type { Group, Profile } from "@/lib/types";

type Member = Pick<Profile, "id" | "display_name" | "avatar_url"> & {
  joined_at: string;
};

interface Props {
  group: Group;
  members: Member[];
  currentUserId: string;
}

export function GroupSettings({ group, members, currentUserId }: Props) {
  const [state, formAction, pending] = useActionState(
    updateGroupAction,
    undefined,
  );
  const [inviteCode, setInviteCode] = useState(group.invite_code);
  const [copied, setCopied] = useState(false);
  const [regenerating, startRegen] = useTransition();
  const [removing, startRemove] = useTransition();

  function copyCode() {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast.success("Invite code copied");
    setTimeout(() => setCopied(false), 1500);
  }

  function regenerate() {
    startRegen(async () => {
      const res = await regenerateInviteCodeAction(group.id);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      if ("code" in res && res.code) {
        setInviteCode(res.code);
        toast.success("New invite code generated");
      }
    });
  }

  function remove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from the group?`)) return;
    startRemove(async () => {
      const res = await removeMemberAction(group.id, userId);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`${name} removed`);
    });
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Details</h2>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="group_id" value={group.id} />
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={group.name}
              required
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={group.description ?? ""}
              maxLength={280}
            />
          </div>
          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6">
        <h2 className="font-display text-lg font-semibold mb-1">Invite code</h2>
        <p className="text-sm text-fg-muted mb-4">
          Share this with the homies so they can join. Regenerating it
          invalidates the old one.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-border-strong bg-bg-elev px-4 py-2.5 font-mono tracking-widest text-accent">
            {inviteCode}
          </div>
          <Button variant="secondary" onClick={copyCode} type="button">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="outline"
            onClick={regenerate}
            type="button"
            disabled={regenerating}
          >
            <RefreshCw
              className={`size-4 ${regenerating ? "animate-spin" : ""}`}
            />
            Regenerate
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="font-display text-lg font-semibold">
            Members ({members.length})
          </h2>
        </div>
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 p-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar src={m.avatar_url} name={m.display_name} size="sm" />
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {m.display_name}
                    {m.id === group.created_by && (
                      <span className="ml-2 text-xs text-accent">creator</span>
                    )}
                    {m.id === currentUserId && m.id !== group.created_by && (
                      <span className="ml-2 text-xs text-fg-subtle">(you)</span>
                    )}
                  </div>
                </div>
              </div>
              {m.id !== group.created_by && (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  disabled={removing}
                  onClick={() => remove(m.id, m.display_name)}
                  className="text-danger hover:text-danger"
                >
                  <UserMinus className="size-4" />
                  <span className="hidden sm:inline">Remove</span>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
