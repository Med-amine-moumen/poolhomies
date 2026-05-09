-- ============================================================================
-- 0003 — admin role + match comments
--
-- Adds:
--   * profiles.is_admin column + helper public.is_admin()
--   * RLS overrides so admins can do anything on every table
--   * match_comments table for trash-talk threads under each match
--   * trigger that prevents non-admins from elevating their own privileges
--
-- After running this migration, promote yourself to admin by running:
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'you@example.com');
-- (run from the SQL editor — bypasses the trigger because auth.uid() is null
-- in dashboard sessions).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. is_admin column + helper
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Admin override policies — admins bypass normal RLS on every table
-- ----------------------------------------------------------------------------
drop policy if exists "admin_all_profiles" on public.profiles;
create policy "admin_all_profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_groups" on public.groups;
create policy "admin_all_groups" on public.groups
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_group_members" on public.group_members;
create policy "admin_all_group_members" on public.group_members
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_matches" on public.matches;
create policy "admin_all_matches" on public.matches
  for all using (public.is_admin()) with check (public.is_admin());

-- Allow admins (and anyone, really, since matches are normally immutable)
-- to update/delete matches. We add explicit update/delete policies for
-- admins only, since 0001 created none.
-- (the admin_all_matches policy above already covers this — kept for clarity)

-- ----------------------------------------------------------------------------
-- 3. Prevent non-admins from elevating themselves to admin
-- ----------------------------------------------------------------------------
create or replace function public.profiles_protect_is_admin()
returns trigger
language plpgsql
as $$
begin
  -- Only check when the column actually changes. Allow when the request
  -- isn't an authenticated user (auth.uid() is null) — that means we're
  -- running SQL from the dashboard / service role, which is fine.
  if new.is_admin is distinct from old.is_admin
    and auth.uid() is not null
    and not public.is_admin()
  then
    raise exception 'Only admins can change is_admin';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_is_admin on public.profiles;
create trigger protect_is_admin
  before update on public.profiles
  for each row execute function public.profiles_protect_is_admin();

-- ----------------------------------------------------------------------------
-- 4. match_comments — short comment thread under each logged match
-- ----------------------------------------------------------------------------
create table if not exists public.match_comments (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references public.matches(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  body text not null check (length(trim(body)) > 0 and length(body) <= 500),
  created_at timestamptz default now()
);

create index if not exists idx_match_comments_match
  on public.match_comments(match_id, created_at);

alter table public.match_comments enable row level security;

-- helper: caller is in the same group as the match
create or replace function public.is_match_member(p_match_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.matches m
    join public.group_members gm on gm.group_id = m.group_id
    where m.id = p_match_id and gm.user_id = auth.uid()
  );
$$;

grant execute on function public.is_match_member(uuid) to authenticated;

drop policy if exists "match_comments_select_member" on public.match_comments;
create policy "match_comments_select_member" on public.match_comments
  for select using (public.is_match_member(match_id));

drop policy if exists "match_comments_insert_self" on public.match_comments;
create policy "match_comments_insert_self" on public.match_comments
  for insert with check (
    auth.uid() = user_id and public.is_match_member(match_id)
  );

drop policy if exists "match_comments_delete_self" on public.match_comments;
create policy "match_comments_delete_self" on public.match_comments
  for delete using (auth.uid() = user_id);

drop policy if exists "admin_all_match_comments" on public.match_comments;
create policy "admin_all_match_comments" on public.match_comments
  for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. repair_group_memberships(group_id) — self-healing utility
-- Inserts a group_members row for every user referenced in any match in the
-- group. Useful if the original create-group flow lost a membership row.
-- Caller must be the group creator or an admin.
-- ----------------------------------------------------------------------------
create or replace function public.repair_group_memberships(p_group_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_inserted int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.groups
    where id = p_group_id and created_by = v_user_id
  ) and not public.is_admin() then
    raise exception 'Not authorized to repair this group';
  end if;

  with players as (
    select winner_id as player_id from public.matches where group_id = p_group_id
    union
    select loser_id  as player_id from public.matches where group_id = p_group_id
    union
    select v_user_id as player_id   -- always include the caller
  ),
  inserted as (
    insert into public.group_members (group_id, user_id)
    select p_group_id, player_id from players
    on conflict (group_id, user_id) do nothing
    returning 1
  )
  select count(*)::int into v_inserted from inserted;

  return v_inserted;
end;
$$;

grant execute on function public.repair_group_memberships(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. admin_delete_user(user_id) — admin-only cascade removal of an account
-- ----------------------------------------------------------------------------
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Refuse to delete your own account from the admin panel';
  end if;
  -- Cascade is set up on FKs (profiles -> auth.users on delete cascade,
  -- and downstream tables -> profiles). Removing the auth user removes
  -- everything else.
  delete from auth.users where id = p_user_id;
end;
$$;

grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Refresh PostgREST schema cache
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';
