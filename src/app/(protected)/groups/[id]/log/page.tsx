import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogWinForm } from "@/components/log-win-form";
import { FormBackdrop } from "@/components/form-backdrop";
import type { Profile } from "@/lib/types";

type MemberRow = {
  user_id: string;
  profiles: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
};

export default async function LogWinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, profiles(id, display_name, avatar_url)")
    .eq("group_id", id);

  const memberProfiles =
    ((members as unknown as MemberRow[] | null)
      ?.map((m) => m.profiles)
      .filter(
        (p): p is Pick<Profile, "id" | "display_name" | "avatar_url"> =>
          p !== null,
      ) ?? []);

  return (
    <div className="max-w-xl">
      <FormBackdrop />
      <div className="rounded-2xl border border-border-strong bg-card/95 backdrop-blur-md shadow-2xl shadow-black/40 p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold tracking-tight mb-1">
          Log a win
        </h2>
        <p className="text-fg-muted mb-6">
          Who won, who got bodied, where, and when. Takes ten seconds.
        </p>
        <LogWinForm
          groupId={id}
          members={memberProfiles}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
