"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logWinAction } from "@/actions/matches";
import { GAME_TYPES, type Profile } from "@/lib/types";

interface Props {
  groupId: string;
  members: Pick<Profile, "id" | "display_name" | "avatar_url">[];
  currentUserId: string;
}

function defaultLocalDateTime(): string {
  // <input type="datetime-local"> wants a value without timezone, in the
  // user's local time. Subtract the offset so the displayed value matches now.
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function LogWinForm({ groupId, members, currentUserId }: Props) {
  const [state, formAction, pending] = useActionState(logWinAction, undefined);
  const [tzOffset, setTzOffset] = useState(0);
  const [winnerId, setWinnerId] = useState(currentUserId);

  useEffect(() => {
    setTzOffset(new Date().getTimezoneOffset());
  }, []);
  const [loserId, setLoserId] = useState(
    members.find((m) => m.id !== currentUserId)?.id ?? "",
  );
  const sameError = winnerId && loserId && winnerId === loserId;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="tz_offset" value={tzOffset} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="winner_id">Winner</Label>
          <Select
            id="winner_id"
            name="winner_id"
            value={winnerId}
            onChange={(e) => setWinnerId(e.target.value)}
            required
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === currentUserId ? `${m.display_name} (you)` : m.display_name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loser_id">vs. who</Label>
          <Select
            id="loser_id"
            name="loser_id"
            value={loserId}
            onChange={(e) => setLoserId(e.target.value)}
            required
          >
            <option value="" disabled>
              Pick an opponent
            </option>
            {members
              .filter((m) => m.id !== winnerId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
          </Select>
        </div>
      </div>
      {sameError && (
        <p className="text-sm text-danger">
          Winner and opponent must be different.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="location">Where</Label>
          <Input
            id="location"
            name="location"
            placeholder="Bar Le Spot, Dave's garage…"
            maxLength={120}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="game_type">Game</Label>
          <Select id="game_type" name="game_type" defaultValue="8-Ball">
            {GAME_TYPES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="played_at">When</Label>
        <Input
          id="played_at"
          name="played_at"
          type="datetime-local"
          defaultValue={defaultLocalDateTime()}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="The 8-ball banked off three rails. Dave was furious."
          maxLength={500}
        />
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending || Boolean(sameError)}
      >
        {pending ? "Logging…" : "Log the win"}
      </Button>
    </form>
  );
}
