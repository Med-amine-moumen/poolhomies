import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GroupTabs } from "@/components/group-tabs";

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

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, invite_code, created_by, created_at")
    .eq("id", id)
    .single();

  if (!group) notFound();
  const isCreator = group.created_by === user.id;

  return (
    <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <Link
            href="/dashboard"
            className="text-sm text-fg-muted hover:text-fg inline-block mb-1"
          >
            ← Dashboard
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight truncate">
            {group.name}
          </h1>
          {group.description && (
            <p className="text-fg-muted mt-1">{group.description}</p>
          )}
        </div>
        {isCreator && (
          <Link
            href={`/groups/${id}/settings`}
            className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
          >
            <Settings className="size-4" />
            Settings
          </Link>
        )}
      </div>

      <GroupTabs groupId={id} />

      <div className="mt-6">{children}</div>
    </main>
  );
}
