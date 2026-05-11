import Link from "next/link";
import { ShieldCheck, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { logoutAction } from "@/actions/auth";

interface NavProps {
  profile: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    is_admin?: boolean;
  } | null;
}

export function Nav({ profile }: NavProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-black/50 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="font-display text-lg font-bold tracking-tight"
        >
          <span className="text-accent">pool</span>
          <span className="text-fg/90">homies</span>
        </Link>

        <div className="flex items-center gap-2">
          {profile?.is_admin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm text-accent bg-accent/10 border border-accent/30 hover:bg-accent/20 rounded-full px-3 py-1 transition-colors"
              title="Admin panel"
            >
              <ShieldCheck className="size-3.5" />
              <span className="hidden sm:inline text-xs font-medium">Admin</span>
            </Link>
          )}
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-2 py-1 hover:bg-white/10 transition-colors"
          >
            <span className="hidden sm:block text-sm text-fg/80">
              {profile?.display_name ?? "Profile"}
            </span>
            <Avatar
              src={profile?.avatar_url}
              name={profile?.display_name ?? "?"}
              size="sm"
            />
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-sm text-fg/70 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-fg rounded-full px-3 py-1.5 transition-colors"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
