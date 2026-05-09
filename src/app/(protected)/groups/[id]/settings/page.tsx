import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupSettings } from "@/components/group-settings";
import { FormBackdrop } from "@/components/form-backdrop";
import type { Profile } from "@/lib/types";

type MemberRow = {
  user_id: string;
  joined_at: string;
  profiles: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
};

export default async function SettingsPage({
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

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, invite_code, created_by, created_at")
    .eq("id", id)
    .single();
  if (!group) notFound();
  if (group.created_by !== user.id) {
    redirect(`/groups/${id}`);
  }

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, joined_at, profiles(id, display_name, avatar_url)")
    .eq("group_id", id);

  const memberList =
    ((members as unknown as MemberRow[] | null)
      ?.filter((m) => m.profiles)
      .map((m) => ({
        ...m.profiles!,
        joined_at: m.joined_at,
      })) ?? []);

  return (
    <>
      <FormBackdrop />
      <GroupSettings
        group={group}
        members={memberList}
        currentUserId={user.id}
      />
    </>
  );
}
