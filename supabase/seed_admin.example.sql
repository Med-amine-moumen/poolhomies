-- ============================================================================
-- Bootstrap a dedicated admin account.
--
-- HOW TO USE:
--   1. Copy this file to `seed_admin.sql` (the real one is gitignored)
--   2. Edit the v_email, v_password, and v_display_name values below
--   3. Run the copied file in the Supabase SQL Editor (one-time setup)
--   4. Log in to the app with the email + password you set
--
-- The account is created with email confirmation already completed, so you
-- can log in immediately. is_admin is set to true so the user gets the
-- "Admin" nav pill and access to /admin.
--
-- Re-running the file is safe: if the email already exists it just makes
-- sure that user is marked as admin.
-- ============================================================================

DO $$
DECLARE
  v_email         text := 'admin@poolhomies.local';
  v_password      text := 'CHANGE-ME';
  v_display_name  text := 'Admin';

  v_user_id     uuid;
  v_existing_id uuid;
BEGIN
  SELECT id INTO v_existing_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.profiles
       SET is_admin = true,
           display_name = COALESCE(NULLIF(display_name, ''), v_display_name)
     WHERE id = v_existing_id;
    RAISE NOTICE 'Admin user % already existed; promoted to is_admin (id %)', v_email, v_existing_id;
    RETURN;
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change, email_change_token_new
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', v_display_name),
    now(), now(),
    '', '',
    '', ''
  );

  INSERT INTO public.profiles (id, display_name, is_admin)
  VALUES (v_user_id, v_display_name, true)
  ON CONFLICT (id) DO UPDATE
    SET is_admin = true,
        display_name = COALESCE(NULLIF(public.profiles.display_name, ''), EXCLUDED.display_name);

  RAISE NOTICE 'Created admin user % (id %). Log in with the password you set.', v_email, v_user_id;
END $$;
