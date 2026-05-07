ALTER TABLE public.lane_assignments DROP CONSTRAINT IF EXISTS lane_assignments_lane_number_key;
ALTER TABLE public.weapons DROP CONSTRAINT IF EXISTS weapons_weapon_name_key;

ALTER TABLE public.lane_assignments ADD COLUMN section text;
ALTER TABLE public.weapons ADD COLUMN section text;

UPDATE public.lane_assignments SET section = 'idt' WHERE section IS NULL;
UPDATE public.weapons SET section = 'idt' WHERE section IS NULL;

ALTER TABLE public.lane_assignments ALTER COLUMN section SET NOT NULL;
ALTER TABLE public.weapons ALTER COLUMN section SET NOT NULL;

ALTER TABLE public.lane_assignments
  ADD CONSTRAINT lane_assignments_section_check
  CHECK (section IN ('idt','odt','live_fire','qm360'));
ALTER TABLE public.weapons
  ADD CONSTRAINT weapons_section_check
  CHECK (section IN ('idt','odt','live_fire','qm360'));

ALTER TABLE public.lane_assignments
  ADD CONSTRAINT lane_assignments_section_lane_unique UNIQUE (section, lane_number);
ALTER TABLE public.weapons
  ADD CONSTRAINT weapons_section_name_unique UNIQUE (section, weapon_name);

INSERT INTO public.lane_assignments (lane_number, section, status)
SELECT ln, sec, 'empty'
FROM (VALUES (1),(2),(3),(4),(5)) AS l(ln)
CROSS JOIN (VALUES ('odt'),('live_fire'),('qm360')) AS s(sec);

INSERT INTO public.weapons (weapon_name, weapon_type, is_assigned, section)
SELECT weapon_name, weapon_type, false, sec
FROM public.weapons
CROSS JOIN (VALUES ('odt'),('live_fire'),('qm360')) AS s(sec)
WHERE section = 'idt';

CREATE INDEX IF NOT EXISTS idx_lane_assignments_section ON public.lane_assignments(section);
CREATE INDEX IF NOT EXISTS idx_weapons_section ON public.weapons(section);