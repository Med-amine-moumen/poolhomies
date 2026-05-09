import Link from "next/link";
import { ShieldCheck } from "lucide-react";
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
    <header className="sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="font-display text-xl font-bold tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
        >
          <span className="text-accent">pool</span>homies
        </Link>

        <div className="flex items-center gap-2">
          {profile?.is_admin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm text-accent bg-accent-soft border border-accent/40 hover:bg-accent/20 rounded-full px-3 py-1.5 transition-colors"
              title="Admin panel"
            >
              <ShieldCheck className="size-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-full bg-black/30 backdrop-blur-md border border-white/10 px-2.5 py-1 hover:bg-black/55 transition-colors"
          >
            <span className="hidden sm:block text-sm text-fg">
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
              className="text-sm text-fg bg-black/30 backdrop-blur-md border border-white/10 hover:bg-black/55 rounded-full px-3 py-1.5 transition-colors"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
