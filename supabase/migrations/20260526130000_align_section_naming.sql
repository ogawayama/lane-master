-- Helhetsprototyp Pass 1 — align section naming
--
-- Vår första sessions-migration använde 'live-fire' (bindestreck), men
-- lanemasters Section-typ och faktiska data i lane_assignments använder
-- 'live_fire' (underscore). Justerar sessions-tabellen till underscore
-- så join:s och filter-värden funkar utan normalisering i kod.

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_section_check;

UPDATE public.sessions SET section = 'live_fire' WHERE section = 'live-fire';

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_section_check
  CHECK (section IN ('idt', 'odt', 'live_fire', 'qm360'));
