CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_bootstrap_available()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'admin'
  )
$$;

DROP POLICY IF EXISTS "Allow all access for kiosk" ON public.users;
DROP POLICY IF EXISTS "Allow all access for kiosk" ON public.weapons;
DROP POLICY IF EXISTS "Allow all access for kiosk" ON public.lane_assignments;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.users
  ALTER COLUMN user_id SET DATA TYPE text,
  ALTER COLUMN rfid SET DATA TYPE text;

CREATE UNIQUE INDEX IF NOT EXISTS users_user_id_key ON public.users (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS users_rfid_key ON public.users (rfid);
CREATE INDEX IF NOT EXISTS users_name_search_idx ON public.users (first_name, last_name);
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS lane_assignments_status_idx ON public.lane_assignments (status, lane_number);
CREATE INDEX IF NOT EXISTS weapons_assignment_idx ON public.weapons (is_assigned, weapon_id);

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins can view role assignments"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Admins can manage role assignments"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Kiosk can read users"
ON public.users
FOR SELECT
TO public
USING (true);

CREATE POLICY "Kiosk can create users"
ON public.users
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Kiosk can update users"
ON public.users
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can delete users"
ON public.users
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Kiosk can read weapons"
ON public.weapons
FOR SELECT
TO public
USING (true);

CREATE POLICY "Kiosk can update weapons"
ON public.weapons
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can create weapons"
ON public.weapons
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete weapons"
ON public.weapons
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Kiosk can read lane assignments"
ON public.lane_assignments
FOR SELECT
TO public
USING (true);

CREATE POLICY "Kiosk can update lane assignments"
ON public.lane_assignments
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can create lane assignments"
ON public.lane_assignments
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete lane assignments"
ON public.lane_assignments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));