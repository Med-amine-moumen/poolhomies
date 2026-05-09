"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/actions/profile";

interface Props {
  initialDisplayName: string;
  initialAvatarUrl: string;
  email: string;
}

export function ProfileForm({
  initialDisplayName,
  initialAvatarUrl,
  email,
}: Props) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Profile updated");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar
          src={initialAvatarUrl || null}
          name={initialDisplayName || email}
          size="xl"
        />
        <div className="text-sm text-fg-muted">{email}</div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          required
          defaultValue={initialDisplayName}
          maxLength={40}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="avatar_url">Avatar URL (optional)</Label>
        <Input
          id="avatar_url"
          name="avatar_url"
          type="url"
          defaultValue={initialAvatarUrl}
          placeholder="https://…"
        />
        <p className="text-xs text-fg-subtle">
          Paste a link to an image. Storage upload coming later.
        </p>
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
