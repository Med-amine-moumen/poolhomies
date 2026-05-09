-- ============================================================================
-- poolhomies — initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`)
-- ============================================================================

-- Profiles ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Groups --------------------------------------------------------------------
create table if not exists public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  invite_code text unique not null,
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz default now()
);

-- Group membership ----------------------------------------------------------
create table if not exists public.group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

-- Matches -------------------------------------------------------------------
create table if not exists public.matches (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  winner_id uuid references public.profiles(id) not null,
  loser_id uuid references public.profiles(id) not null,
  location text,
  game_type text default '8-Ball',
  notes text,
  played_at timestamptz default now(),
  logged_by uuid references public.profiles(id) not null,
  created_at timestamptz default now(),
  constraint matches_winner_neq_loser check (winner_id <> loser_id)
);

create index if not exists idx_matches_group on public.matches(group_id);
create index if not exists idx_matches_winner on public.matches(winner_id);
create index if not exists idx_matches_loser on public.matches(loser_id);
create index if not exists idx_matches_played on public.matches(played_at desc);
create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_group_members_group on public.group_members(group_id);

-- ============================================================================
-- Profile creation trigger — runs when a new auth user is created
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Helper: is_group_member — used by RLS policies. SECURITY DEFINER avoids
-- recursive policy evaluation when group_members policies need to ask
-- "is this user a member of this group?".
-- ============================================================================
create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.matches enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- groups --------------------------------------------------------------------
drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member" on public.groups
  for select using (public.is_group_member(id, auth.uid()));

drop policy if exists "groups_insert_self" on public.groups;
create policy "groups_insert_self" on public.groups
  for insert with check (auth.uid() = created_by);

drop policy if exists "groups_update_creator" on public.groups;
create policy "groups_update_creator" on public.groups
  for update using (auth.uid() = created_by) with check (auth.uid() = created_by);

drop policy if exists "groups_delete_creator" on public.groups;
create policy "groups_delete_creator" on public.groups
  for delete using (auth.uid() = created_by);

-- group_members -------------------------------------------------------------
drop policy if exists "group_members_select_fellow" on public.group_members;
create policy "group_members_select_fellow" on public.group_members
  for select using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "group_members_insert_self" on public.group_members;
create policy "group_members_insert_self" on public.group_members
  for insert with check (auth.uid() = user_id);

drop policy if exists "group_members_delete_self_or_creator" on public.group_members;
create policy "group_members_delete_self_or_creator" on public.group_members
  for delete using (
    auth.uid() = user_id
    or auth.uid() = (select created_by from public.groups where id = group_id)
  );

-- matches -------------------------------------------------------------------
drop policy if exists "matches_select_member" on public.matches;
create policy "matches_select_member" on public.matches
  for select using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "matches_insert_member" on public.matches;
create policy "matches_insert_member" on public.matches
  for insert with check (
    public.is_group_member(group_id, auth.uid())
    and auth.uid() = logged_by
    and public.is_group_member(group_id, winner_id)
    and public.is_group_member(group_id, loser_id)
  );

-- matches are immutable: no update or delete policies

-- ============================================================================
-- get_leaderboard(group_uuid)
-- Returns one row per group member with wins, losses, win %, current streak,
-- best streak. Streaks are computed from matches.played_at chronology.
-- ============================================================================
create or replace function public.get_leaderboard(group_uuid uuid)
returns table (
  player_id uuid,
  display_name text,
  avatar_url text,
  wins bigint,
  losses bigint,
  total_matches bigint,
  win_pct numeric,
  current_streak int,
  best_streak int
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return query
  with members as (
    select gm.user_id as id, p.display_name, p.avatar_url
    from public.group_members gm
    join public.profiles p on p.id = gm.user_id
    where gm.group_id = group_uuid
  ),
  player_matches as (
    -- one row per (player, match) with result = 'W' or 'L'
    select
      m.id as match_id,
      m.played_at,
      mem.id as player_id,
      case when m.winner_id = mem.id then 'W' else 'L' end as result
    from public.matches m
    join members mem
      on mem.id = m.winner_id or mem.id = m.loser_id
    where m.group_id = group_uuid
  ),
  ordered as (
    select
      player_id,
      result,
      played_at,
      row_number() over (partition by player_id order by played_at, match_id) as rn
    from player_matches
  ),
  -- group consecutive same-result rows per player using "gaps and islands"
  grouped as (
    select
      player_id,
      result,
      rn,
      rn - row_number() over (partition by player_id, result order by rn) as grp
    from ordered
  ),
  streak_runs as (
    select
      player_id,
      result,
      count(*) as run_len,
      max(rn) as run_end
    from grouped
    group by player_id, result, grp
  ),
  best_per_player as (
    select player_id, max(run_len)::int as best_streak
    from streak_runs
    where result = 'W'
    group by player_id
  ),
  last_run_per_player as (
    -- the most recent run per player; if it is a W run, it's the current streak
    select distinct on (player_id)
      player_id, result, run_len
    from streak_runs
    order by player_id, run_end desc
  ),
  agg as (
    select
      mem.id as player_id,
      mem.display_name,
      mem.avatar_url,
      coalesce(sum(case when pm.result = 'W' then 1 else 0 end), 0)::bigint as wins,
      coalesce(sum(case when pm.result = 'L' then 1 else 0 end), 0)::bigint as losses
    from members mem
    left join player_matches pm on pm.player_id = mem.id
    group by mem.id, mem.display_name, mem.avatar_url
  )
  select
    a.player_id,
    a.display_name,
    a.avatar_url,
    a.wins,
    a.losses,
    (a.wins + a.losses) as total_matches,
    case
      when (a.wins + a.losses) = 0 then 0
      else round((a.wins::numeric / (a.wins + a.losses)::numeric) * 100, 1)
    end as win_pct,
    case
      when lr.result = 'W' then lr.run_len::int
      else 0
    end as current_streak,
    coalesce(bp.best_streak, 0) as best_streak
  from agg a
  left join best_per_player bp on bp.player_id = a.player_id
  left join last_run_per_player lr on lr.player_id = a.player_id
  order by a.wins desc, a.losses asc, a.display_name asc;
end;
$$;

-- ============================================================================
-- get_h2h(group_uuid, player_a, player_b)
-- Head-to-head record between two players in a group.
-- ============================================================================
create or replace function public.get_h2h(group_uuid uuid, player_a uuid, player_b uuid)
returns table (
  a_wins bigint,
  b_wins bigint,
  total bigint,
  last_match timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    coalesce(sum(case when m.winner_id = player_a then 1 else 0 end), 0)::bigint as a_wins,
    coalesce(sum(case when m.winner_id = player_b then 1 else 0 end), 0)::bigint as b_wins,
    count(*)::bigint as total,
    max(m.played_at) as last_match
  from public.matches m
  where m.group_id = group_uuid
    and (
      (m.winner_id = player_a and m.loser_id = player_b)
      or (m.winner_id = player_b and m.loser_id = player_a)
    );
$$;

-- ============================================================================
-- get_group_by_invite_code — used by the join flow. RLS would block reading
-- a group you aren't yet a member of, so this SECURITY DEFINER lookup
-- exposes only the (id, name) pair given a valid code.
-- ============================================================================
create or replace function public.get_group_by_invite_code(code text)
returns table (id uuid, name text)
language sql
security definer
stable
set search_path = public
as $$
  select id, name from public.groups
  where invite_code = upper(code)
  limit 1;
$$;

grant execute on function public.get_group_by_invite_code(text) to authenticated;
grant execute on function public.get_leaderboard(uuid) to authenticated;
grant execute on function public.get_h2h(uuid, uuid, uuid) to authenticated;

-- ============================================================================
-- Realtime — enable for matches so leaderboard can subscribe
-- ============================================================================
alter publication supabase_realtime add table public.matches;
