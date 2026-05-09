import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30">
        <div className="px-5 sm:px-8 h-16 flex items-center justify-between max-w-6xl w-full mx-auto">
          <span className="font-display text-xl font-bold tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
            <span className="text-accent">pool</span>homies
          </span>
          <nav className="flex items-center gap-2">
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="bg-black/30 backdrop-blur-md text-fg hover:bg-black/55 hover:text-fg border border-white/10"
              >
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="shadow-lg shadow-black/40">
                Sign up
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-5 py-16 sm:py-24 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-card/85 backdrop-blur-md px-3 py-1 text-xs text-fg-muted mb-6">
          <span className="size-1.5 rounded-full bg-accent animate-pulse" />
          For pool homies who keep score
        </div>
        <h1 className="font-display text-5xl sm:text-7xl font-bold tracking-tight leading-[0.95] drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          Settle every game.
          <br />
          <span className="text-accent">Track every win.</span>
        </h1>
        <p className="mt-6 text-lg text-fg max-w-xl drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
          Log matches, ride streaks, and crown the group champion. A private
          wins tracker for you and the homies.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto">
              Start tracking
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              I have an account
            </Button>
          </Link>
        </div>
      </main>

    </div>
  );
}
