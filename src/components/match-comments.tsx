"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageSquare, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatRelative } from "@/lib/utils";
import {
  addMatchCommentAction,
  deleteMatchCommentAction,
} from "@/actions/matches";
import type { MatchCommentWithProfile } from "@/lib/types";

interface Props {
  matchId: string;
  groupId: string;
  comments: MatchCommentWithProfile[];
  currentUserId: string;
  isAdmin?: boolean;
}

export function MatchComments({
  matchId,
  groupId,
  comments,
  currentUserId,
  isAdmin,
}: Props) {
  const [open, setOpen] = useState(comments.length > 0);
  const [state, formAction, pending] = useActionState(
    addMatchCommentAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [deletePending, startDelete] = useTransition();

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      toast.success("Comment posted");
    }
    if (state?.error) toast.error(state.error);
  }, [state]);

  function onDelete(commentId: string) {
    startDelete(async () => {
      const res = await deleteMatchCommentAction(commentId, groupId);
      if (res.error) toast.error(res.error);
      else toast.success("Comment deleted");
    });
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg transition-colors"
        >
          <MessageSquare className="size-3.5" />
          {comments.length === 0
            ? "Add a comment"
            : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
        </button>
      ) : (
        <div className="space-y-3">
          {comments.length > 0 && (
            <ul className="space-y-2.5">
              {comments.map((c) => {
                const canDelete = c.user_id === currentUserId || isAdmin;
                return (
                  <li key={c.id} className="flex items-start gap-2.5">
                    <Avatar
                      src={c.profile.avatar_url}
                      name={c.profile.display_name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {c.profile.display_name}
                        </span>
                        <span className="text-xs text-fg-subtle">
                          {formatRelative(c.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-fg whitespace-pre-wrap break-words">
                        {c.body}
                      </p>
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(c.id)}
                        disabled={deletePending}
                        className="text-fg-subtle hover:text-danger transition-colors disabled:opacity-50"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <form ref={formRef} action={formAction} className="space-y-2">
            <input type="hidden" name="match_id" value={matchId} />
            <input type="hidden" name="group_id" value={groupId} />
            <Textarea
              name="body"
              required
              maxLength={500}
              placeholder="Trash talk, memorable shots, or who chalked up the wrong cue…"
              rows={2}
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
              {comments.length === 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Posting…" : "Post comment"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
