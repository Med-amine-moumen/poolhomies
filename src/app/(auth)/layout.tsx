import Link from "next/link";
import { FormBackdrop } from "@/components/form-backdrop";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <FormBackdrop />
      <header className="sticky top-0 z-30">
        <div className="px-5 sm:px-8 h-16 flex items-center max-w-6xl w-full mx-auto">
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
          >
            <span className="text-accent">pool</span>homies
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-start sm:items-center justify-center px-5 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border-strong bg-card/95 backdrop-blur-md shadow-2xl shadow-black/40 p-6 sm:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
