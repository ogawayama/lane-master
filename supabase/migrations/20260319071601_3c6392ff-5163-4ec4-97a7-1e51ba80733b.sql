
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Users table
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  rfid TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access for kiosk" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- Weapons table
CREATE TABLE public.weapons (
  weapon_id SERIAL PRIMARY KEY,
  weapon_name TEXT NOT NULL UNIQUE,
  weapon_type TEXT NOT NULL,
  is_assigned BOOLEAN NOT NULL DEFAULT false,
  assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weapons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access for kiosk" ON public.weapons FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_weapons_updated_at BEFORE UPDATE ON public.weapons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lane assignments table
CREATE TABLE public.lane_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lane_number INTEGER NOT NULL UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  weapon_id INTEGER REFERENCES public.weapons(weapon_id) ON DELETE SET NULL,
  weapon_name TEXT,
  weapon_type TEXT,
  status TEXT NOT NULL DEFAULT 'empty' CHECK (status IN ('empty', 'occupied')),
  assigned_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lane_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access for kiosk" ON public.lane_assignments FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_lane_assignments_updated_at BEFORE UPDATE ON public.lane_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime on lane_assignments and weapons
ALTER PUBLICATION supabase_realtime ADD TABLE public.lane_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weapons;

-- Seed weapons
INSERT INTO public.weapons (weapon_name, weapon_type) VALUES
  ('Falcon A', 'RK95'),
  ('Falcon B', 'RK95'),
  ('Eagle X', 'Colt M4'),
  ('Hawk D', 'Colt M4'),
  ('Eagle A', 'Colt M4');

-- Seed 5 empty lanes
INSERT INTO public.lane_assignments (lane_number, status) VALUES
  (1, 'empty'),
  (2, 'empty'),
  (3, 'empty'),
  (4, 'empty'),
  (5, 'empty');

-- Seed demo users for testing
INSERT INTO public.users (user_id, rfid, first_name, last_name) VALUES
  ('USR001', 'RFID-TEST-001', 'Joakim', 'Berg'),
  ('USR002', 'RFID-TEST-002', 'Erik', 'Lindqvist'),
  ('USR003', 'RFID-TEST-003', 'Anna', 'Svensson');
