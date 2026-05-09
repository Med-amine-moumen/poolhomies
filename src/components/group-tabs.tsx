"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Trophy, History, Swords, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = (base: string) => [
  { href: base, label: "Leaderboard", Icon: Trophy },
  { href: `${base}/history`, label: "History", Icon: History },
  { href: `${base}/h2h`, label: "H2H", Icon: Swords },
  { href: `${base}/log`, label: "Log a win", Icon: Plus, accent: true },
];

export function GroupTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/groups/${groupId}`;
  const tabs = TABS(base);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "relative flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-full whitespace-nowrap",
              "transition-colors duration-150",
              active
                ? t.accent
                  ? "text-black"
                  : "text-accent"
                : t.accent
                  ? "text-accent hover:bg-accent/10"
                  : "text-fg-muted hover:text-fg hover:bg-white/5",
            )}
          >
            {active && (
              <motion.span
                layoutId="tab-pill"
                className={cn(
                  "absolute inset-0 rounded-full",
                  t.accent ? "bg-accent" : "bg-accent/15 border border-accent/30",
                )}
                transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
              />
            )}
            <t.Icon className="relative size-3.5 shrink-0" />
            <span className="relative">{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
