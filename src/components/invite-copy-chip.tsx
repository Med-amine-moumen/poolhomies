"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function InviteCopyChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
      title="Copy invite code"
    >
      <span className="font-mono">{code}</span>
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  );
}
