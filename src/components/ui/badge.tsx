import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-border-strong bg-card text-fg-muted",
        accent: "border-accent/40 bg-accent-soft text-accent",
        danger: "border-danger/40 bg-danger-soft text-danger",
        fire: "border-[color:var(--color-fire)]/40 bg-[color:var(--color-fire)]/15 text-[color:var(--color-fire)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}
