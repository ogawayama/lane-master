-- Helhetsprototyp — utöka sessions.phase med 'select-exercise'
--
-- Per user-feedback 2026-05-26: ny Chromecast-stil pickeryta mellan
-- prepare och check-in. Instruktören ser hela sessionen som en
-- thumbnail-strip på duken och väljer startövning med fjärren.
--
-- Per user-beslut Q1 (skip ahead, no wrap): valet sätter
-- current_exercise_index till picked. Övningarna körs sen i sekvens
-- från den punkten till listans slut.

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_phase_check;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_phase_check
  CHECK (phase IN (
    'idle',
    'prepare',
    'select-exercise',
    'check-in',
    'preflight',
    'exercise',
    'aar',
    'ended'
  ));
