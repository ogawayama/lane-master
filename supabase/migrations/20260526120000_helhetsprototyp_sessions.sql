-- Helhetsprototyp Pass 0 — sessions-tabell
-- Källa: helhetsprototyp/plan.md §5 Pass 0 + §2 (vad vi lägger till)
--
-- En `session` är ett pass: en instruktör + en grupp skyttar + en ordnad
-- lista övningar, drivs igenom av state-machine `phase`. Drivs av /tablet
-- (instruktören) och /wizard (facilitatorn), konsumeras av /duk (projektor).
--
-- OBS: RLS är USING(true) per prototyp-konvention (matchar befintliga
-- tabeller). Detta är medvetet för prototypen och flaggat som P0 för
-- studio-test i spår 02:s tech-prototyp.md §5 (offline + RLS-härdning).

CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL DEFAULT 'idt' CHECK (section IN ('idt', 'odt', 'live-fire', 'qm360')),

  -- State-machine. Driver vad /duk renderar.
  -- 'idle'        — ingen aktiv session; duk visar startskärm
  -- 'prepare'     — instruktören bygger övningslistan (på tablet/desktop)
  -- 'check-in'    — skyttar checkar in; duk visar bangrid
  -- 'preflight'   — kriterieskärm på duk (Preflight & Play)
  -- 'exercise'    — övningen kör; duk visar simulering (placeholder)
  -- 'aar'         — AAR-triage på duk
  -- 'ended'       — sessionen är slut; duk visar farväl/logout
  phase TEXT NOT NULL DEFAULT 'idle' CHECK (phase IN ('idle', 'prepare', 'check-in', 'preflight', 'exercise', 'aar', 'ended')),

  -- Vald övningslista (fri JSON för flexibilitet i Pass 0; struktureras
  -- ordentligt i Pass 2 när spår 01-vyn byggs).
  -- Form: [{id, title, weapon, hits_threshold, time_seconds, spread_threshold}, ...]
  exercise_list JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Vilken övning är aktuell (0-indexerad i exercise_list).
  current_exercise_index INTEGER NOT NULL DEFAULT 0,

  -- Vilken skytt är aktuell i AAR-karusellen (om relevant). FK lös tills
  -- vi kopplar mot users; lane_assignments räcker som proxy under Pass 0.
  current_trainee_id INTEGER,

  -- Lane UI overlay-toggle under exercise-fasen.
  lane_ui_visible BOOLEAN NOT NULL DEFAULT false,

  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access for prototype" ON public.sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime så /duk, /tablet, /wizard ser samma session live.
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;

-- Index för "hitta aktiv session per section" (vanligaste queryn).
CREATE INDEX sessions_active_by_section
  ON public.sessions (section, phase)
  WHERE phase NOT IN ('idle', 'ended');

-- Seed: en idle session per section så ytorna har något att binda mot
-- vid uppstart. Wizard kan reset:a denna till 'prepare' för att starta
-- ett pass.
INSERT INTO public.sessions (section, phase) VALUES
  ('idt', 'idle'),
  ('odt', 'idle'),
  ('live-fire', 'idle'),
  ('qm360', 'idle');
