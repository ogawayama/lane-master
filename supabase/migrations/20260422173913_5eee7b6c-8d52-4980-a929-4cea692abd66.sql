DROP POLICY IF EXISTS "Kiosk can create users" ON public.users;
DROP POLICY IF EXISTS "Kiosk can update users" ON public.users;
DROP POLICY IF EXISTS "Kiosk can update weapons" ON public.weapons;
DROP POLICY IF EXISTS "Kiosk can update lane assignments" ON public.lane_assignments;

CREATE POLICY "Kiosk can create users"
ON public.users
FOR INSERT
TO public
WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');

CREATE POLICY "Kiosk can update users"
ON public.users
FOR UPDATE
TO public
USING (auth.role() = 'anon' OR auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');

CREATE POLICY "Kiosk can update weapons"
ON public.weapons
FOR UPDATE
TO public
USING (auth.role() = 'anon' OR auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');

CREATE POLICY "Kiosk can update lane assignments"
ON public.lane_assignments
FOR UPDATE
TO public
USING (auth.role() = 'anon' OR auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');