import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

type SearchParams = Promise<{
  next?: string;
  notice?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { next, notice } = await searchParams;

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ChevronLeft className="size-4" />
        Back
      </Link>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Log in to keep tracking your wins.
        </p>
      </div>

      {notice === "check-email" && (
        <div className="mb-6 rounded-lg border border-accent/30 bg-accent-soft p-4 text-sm text-accent">
          Account created. Check your email to confirm before logging in.
        </div>
      )}

      <LoginForm next={next} />

      <p className="mt-6 text-center text-sm text-fg-muted">
        New here?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
