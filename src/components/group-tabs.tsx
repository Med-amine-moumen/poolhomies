"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Trophy, Clock, Swords, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = (base: string) => [
  { href: base, label: "Leaderboard", Icon: Trophy },
  { href: `${base}/history`, label: "History", Icon: Clock },
  { href: `${base}/h2h`, label: "H2H", Icon: Swords },
  { href: `${base}/log`, label: "Log a win", Icon: PlusCircle, accent: true },
];

export function GroupTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/groups/${groupId}`;
  const tabs = TABS(base);

  return (
    <div className="flex items-center overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
      <div className="flex items-center gap-0.5 rounded-full bg-black/20 border border-white/[0.06] p-1">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "relative flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-full whitespace-nowrap",
                "transition-colors duration-150",
                active
                  ? t.accent
                    ? "text-black"
                    : "text-accent"
                  : t.accent
                    ? "text-accent/80 hover:text-accent hover:bg-white/5"
                    : "text-fg/50 hover:text-fg/80 hover:bg-white/5",
              )}
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className={cn(
                    "absolute inset-0 rounded-full",
                    t.accent
                      ? "bg-accent"
                      : "bg-accent/15 border border-accent/30",
                  )}
                  transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                />
              )}
              <t.Icon className="relative size-3.5 shrink-0" />
              <span className="relative hidden sm:inline">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
