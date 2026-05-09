import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { H2HComparison } from "@/components/h2h-comparison";
import type { Profile } from "@/lib/types";

type MemberRow = {
  user_id: string;
  profiles: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
};

export default async function H2HPage({
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
    <H2HComparison
      groupId={id}
      members={memberProfiles}
      currentUserId={user.id}
    />
  );
}
