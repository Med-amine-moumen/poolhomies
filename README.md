# poolhomies

A private pool/billiards wins tracker. Create a group, log matches, ride streaks, settle debates with head-to-head records.

Built with **Next.js 16 (App Router)**, **Supabase** (Auth + Postgres + Realtime), **Tailwind v4**, **TypeScript**, **Framer Motion**, **Sonner**, and **zod**.

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project. Once it's ready, grab two values from **Project Settings → API**:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Run the migration

In the Supabase dashboard, open the **SQL Editor** and paste the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). Run it.

This creates:

- `profiles`, `groups`, `group_members`, `matches` tables
- A trigger that creates a profile row whenever a new auth user signs up
- Row-Level Security policies (members-only reads, no editing matches after creation)
- Two RPC functions: `get_leaderboard(group_uuid)` and `get_h2h(group_uuid, player_a, player_b)`
- Realtime publication for `matches` (powers live leaderboard updates)

### 3. Wire up your env

Edit `.env.local` (already created at the project root):

```
NEXT_PUBLIC_SUPABASE_URL=<your project url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
```

### 4. Run it

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, create a group, and start logging wins.

## Features

- **Auth**: Email + password via Supabase Auth, protected routes via middleware (`@supabase/ssr`)
- **Groups**: Create groups with shareable invite codes (`RACK-XXXX`), join by code, settings page with rename + regenerate + member management
- **Log a win**: Mobile-friendly form — winner, opponent, location, date, game type, notes
- **Leaderboard**: Wins, losses, win %, current streak, best streak. On-fire (3+ streak) badge with flame animation. Live-updates via Supabase Realtime when new matches land
- **Match history**: Filter by player, date range
- **Head-to-head**: Pick any two players, see their record + last match
- **Profile**: Display name + avatar URL

## Project structure

```
src/
├── app/
│   ├── (auth)/                 # login, signup
│   ├── (protected)/            # dashboard, profile, groups/*
│   ├── layout.tsx              # root layout (fonts, Toaster, dark theme)
│   ├── page.tsx                # landing page
│   └── globals.css             # Tailwind v4 @theme tokens
├── components/                 # UI primitives + feature components
├── actions/                    # Server actions: auth, groups, matches, profile
├── lib/
│   ├── supabase/               # browser, server, middleware clients
│   ├── types.ts
│   └── utils.ts
└── middleware.ts               # auth-guarded route protection

supabase/
└── migrations/
    └── 0001_init.sql
```

## Notes

- **Middleware deprecation**: Next.js 16 emits a deprecation warning for `middleware.ts` (it'll be renamed to `proxy.ts` in a future release). Currently functional; rename when you bump major.
- **Email confirmation**: If Supabase email confirmation is on, signup redirects to login with a "check your email" notice rather than auto-login.
- **Streak math** lives in the `get_leaderboard` SQL function (gaps-and-islands), so the same numbers appear everywhere.
- **Invite codes** are generated server-side in `lib/utils.ts` (`RACK-XXXX`, 4 chars from a 32-char alphabet that excludes confusable glyphs).

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| Auth + DB + Realtime | Supabase (`@supabase/ssr`) |
| Styling | Tailwind v4 |
| Forms | React server actions + zod |
| Toasts | Sonner |
| Animations | Framer Motion + tw-animate-css |
| Icons | Lucide |
