import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Group } from "@/lib/types";

export function GroupCard({ group }: { group: Group }) {
  return (
    <Link
      href={`/groups/${group.id}`}
      className="group rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-5 transition-all hover:border-accent/40 hover:bg-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold truncate">
            {group.name}
          </h3>
          {group.description && (
            <p className="text-sm text-fg-muted line-clamp-2 mt-1">
              {group.description}
            </p>
          )}
        </div>
        <ArrowUpRight className="size-5 text-fg-subtle transition-colors group-hover:text-accent" />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="font-mono text-xs text-fg-subtle">
          {group.invite_code}
        </span>
      </div>
    </Link>
  );
}
