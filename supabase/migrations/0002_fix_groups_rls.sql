-- ============================================================================
-- 0002 — fix groups RLS so the creator can read back their own group
--
-- Bug: creating a group fails with
--   "new row violates row-level security policy for table groups"
--
-- Cause: after INSERT ... RETURNING, Postgres evaluates the SELECT policy on
-- the returned row. The original policy required membership, but the
-- creator isn't a member yet at that moment (the membership row is inserted
-- next), so the read-back fails. Postgres surfaces this as a WITH CHECK
-- violation in the error message.
--
-- Fix: also allow the creator to select rows they own.
-- ============================================================================

drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member" on public.groups
  for select using (
    auth.uid() = created_by
    or public.is_group_member(id, auth.uid())
  );

-- Reload PostgREST schema cache so changes take effect immediately.
notify pgrst, 'reload schema';
