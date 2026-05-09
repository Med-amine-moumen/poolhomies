import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CreateGroupForm } from "@/components/create-group-form";
import { FormBackdrop } from "@/components/form-backdrop";

export default function NewGroupPage() {
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
        <h1 className="font-display text-3xl font-bold tracking-tight">
          New group
        </h1>
        <p className="text-fg-muted mt-1">
          Name it, optionally describe it. You&apos;ll get an invite code to
          share.
        </p>
        <div className="mt-8">
          <CreateGroupForm />
        </div>
      </div>
    </main>
  );
}
