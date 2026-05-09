import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { PoolBallsBackground } from "@/components/pool-balls-bg";
import "./globals.css";

const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "poolhomies — track your pool wins",
  description:
    "A private wins tracker for you and your pool homies. Log matches, climb leaderboards, ride streaks.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col text-fg">
        <PoolBallsBackground />
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              color: "var(--color-fg)",
            },
          }}
        />
      </body>
    </html>
  );
}
