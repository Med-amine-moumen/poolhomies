import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile-form";
import { ChangePasswordForm } from "@/components/change-password-form";
import { FormBackdrop } from "@/components/form-backdrop";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, created_at, is_admin")
    .eq("id", user.id)
    .single();

  return (
    <main className="max-w-xl mx-auto px-5 sm:px-8 py-10">
      <FormBackdrop />
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-fg hover:text-accent mb-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
      >
        <ChevronLeft className="size-4" />
        Back to dashboard
      </Link>
      <div className="rounded-2xl border border-border-strong bg-card/95 backdrop-blur-md shadow-2xl shadow-black/40 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Your profile
            </h1>
            <p className="text-fg-muted mt-1">
              How you show up to the homies on leaderboards.
            </p>
          </div>
          {profile?.is_admin && (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
              <ShieldCheck className="size-3.5" />
              Admin
            </span>
          )}
        </div>
        <div className="mt-8">
          <ProfileForm
            initialDisplayName={profile?.display_name ?? ""}
            initialAvatarUrl={profile?.avatar_url ?? ""}
            email={user.email ?? ""}
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border-strong bg-card/95 backdrop-blur-md shadow-2xl shadow-black/40 p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Change password
        </h2>
        <p className="text-fg-muted mt-1">
          Pick a new password. The next login will require it.
        </p>
        <div className="mt-6">
          <ChangePasswordForm />
        </div>
      </div>
    </main>
  );
}
