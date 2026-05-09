"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function GroupTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/groups/${groupId}`;

  const tabs: { href: string; label: string; primary?: boolean }[] = [
    { href: base, label: "Leaderboard" },
    { href: `${base}/history`, label: "History" },
    { href: `${base}/h2h`, label: "Head-to-head" },
    { href: `${base}/log`, label: "Log a win", primary: true },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-border overflow-x-auto -mx-1 px-1">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors border-b-2 -mb-[1px]",
              active
                ? "text-accent border-accent"
                : t.primary
                  ? "text-accent border-transparent hover:bg-accent-soft"
                  : "text-fg-muted border-transparent hover:text-fg",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
