import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
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
          Join the homies
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Create an account to start tracking your wins.
        </p>
      </div>

      <SignupForm />

      <p className="mt-6 text-center text-sm text-fg-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
