import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="max-w-xl mx-auto px-5 py-20 text-center">
      <h1 className="font-display text-3xl font-bold">Group not found</h1>
      <p className="text-fg-muted mt-2">
        The group might not exist, or you're not a member.
      </p>
      <Link href="/dashboard" className="inline-block mt-6">
        <Button>Back to dashboard</Button>
      </Link>
    </main>
  );
}
