
CREATE TABLE public.qm360_gear (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gear_type TEXT NOT NULL,
  gear_number INTEGER NOT NULL,
  is_assigned BOOLEAN NOT NULL DEFAULT false,
  assigned_to_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gear_type, gear_number)
);

CREATE OR REPLACE FUNCTION public.qm360_validate_gear_type()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.gear_type NOT IN ('PDD','SAT') THEN
    RAISE EXCEPTION 'gear_type must be PDD or SAT';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER qm360_gear_validate_type
BEFORE INSERT OR UPDATE ON public.qm360_gear
FOR EACH ROW EXECUTE FUNCTION public.qm360_validate_gear_type();

CREATE TRIGGER qm360_gear_set_updated_at
BEFORE UPDATE ON public.qm360_gear
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.qm360_gear ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kiosk can read qm360 gear" ON public.qm360_gear FOR SELECT USING (true);
CREATE POLICY "Kiosk can update qm360 gear" ON public.qm360_gear FOR UPDATE
  USING (auth.role() = 'anon' OR auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');
CREATE POLICY "Kiosk can create qm360 gear" ON public.qm360_gear FOR INSERT
  WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');
CREATE POLICY "Admins can delete qm360 gear" ON public.qm360_gear FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.qm360_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  pdd_gear_id UUID NOT NULL REFERENCES public.qm360_gear(id),
  sat_gear_id UUID NOT NULL REFERENCES public.qm360_gear(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER qm360_assignments_set_updated_at
BEFORE UPDATE ON public.qm360_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.qm360_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kiosk can read qm360 assignments" ON public.qm360_assignments FOR SELECT USING (true);
CREATE POLICY "Kiosk can create qm360 assignments" ON public.qm360_assignments FOR INSERT
  WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');
CREATE POLICY "Kiosk can update qm360 assignments" ON public.qm360_assignments FOR UPDATE
  USING (auth.role() = 'anon' OR auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');
CREATE POLICY "Kiosk can delete qm360 assignments" ON public.qm360_assignments FOR DELETE
  USING (auth.role() = 'anon' OR auth.role() = 'authenticated');

ALTER PUBLICATION supabase_realtime ADD TABLE public.qm360_gear;
ALTER PUBLICATION supabase_realtime ADD TABLE public.qm360_assignments;
ALTER TABLE public.qm360_gear REPLICA IDENTITY FULL;
ALTER TABLE public.qm360_assignments REPLICA IDENTITY FULL;

INSERT INTO public.qm360_gear (gear_type, gear_number)
SELECT 'PDD', g FROM generate_series(1,10) g;
INSERT INTO public.qm360_gear (gear_type, gear_number)
SELECT 'SAT', g FROM generate_series(101,110) g;
