
-- 1. Wipe dependent data
UPDATE public.lane_assignments
SET user_id = NULL, first_name = NULL, last_name = NULL,
    weapon_id = NULL, weapon_name = NULL, weapon_type = NULL,
    status = 'empty', assigned_at = NULL;

UPDATE public.weapons SET is_assigned = false, assigned_to_user_id = NULL;
DELETE FROM public.qm360_assignments;
UPDATE public.qm360_gear SET is_assigned = false, assigned_to_user_id = NULL;
DELETE FROM public.users;

-- 2. Drop foreign keys that reference users.id
ALTER TABLE public.lane_assignments DROP CONSTRAINT IF EXISTS lane_assignments_user_id_fkey;
ALTER TABLE public.weapons DROP CONSTRAINT IF EXISTS weapons_assigned_to_user_id_fkey;

-- 3. Reshape lane_assignments: drop first/last name, add name; change user_id to int
ALTER TABLE public.lane_assignments DROP COLUMN first_name;
ALTER TABLE public.lane_assignments DROP COLUMN last_name;
ALTER TABLE public.lane_assignments ADD COLUMN name text;
ALTER TABLE public.lane_assignments ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE public.lane_assignments ALTER COLUMN user_id TYPE integer USING NULL;

-- 4. Change other user-reference columns to integer
ALTER TABLE public.weapons ALTER COLUMN assigned_to_user_id TYPE integer USING NULL;
ALTER TABLE public.qm360_gear ALTER COLUMN assigned_to_user_id TYPE integer USING NULL;
ALTER TABLE public.qm360_assignments ALTER COLUMN user_id TYPE integer USING NULL;

-- 5. Reshape users table to match User Hub exactly
ALTER TABLE public.users DROP COLUMN user_id;
ALTER TABLE public.users DROP COLUMN updated_at;
ALTER TABLE public.users ADD COLUMN name text;
UPDATE public.users SET name = COALESCE(NULLIF(TRIM(CONCAT_WS(' ', first_name, last_name)), ''), 'Unknown');
ALTER TABLE public.users ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.users DROP COLUMN first_name;
ALTER TABLE public.users DROP COLUMN last_name;
ALTER TABLE public.users ALTER COLUMN rfid SET NOT NULL;

-- Replace UUID id with integer id (no sequence — IDs come from User Hub)
ALTER TABLE public.users DROP CONSTRAINT users_pkey;
ALTER TABLE public.users DROP COLUMN id;
ALTER TABLE public.users ADD COLUMN id integer PRIMARY KEY;
