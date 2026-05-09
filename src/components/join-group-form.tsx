"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinGroupAction } from "@/actions/groups";

export function JoinGroupForm() {
  const [state, formAction, pending] = useActionState(
    joinGroupAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="invite_code">Invite code</Label>
        <Input
          id="invite_code"
          name="invite_code"
          required
          placeholder="RACK-X7K9"
          autoComplete="off"
          autoCapitalize="characters"
          className="font-mono uppercase tracking-widest"
        />
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Joining…" : "Join group"}
      </Button>
    </form>
  );
}
