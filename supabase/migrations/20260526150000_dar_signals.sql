-- Helhetsprototyp Pass 5 — DAR signals (spår 03)
--
-- Per [GS-POM spår 03 spårkort §Idén]: under exercise-fasen får varje
-- bana en röd/gul/grön-signal som speglar hur det går för skytten.
-- Signalen visas BARA på instruktörens tablet/Magic Mat — aldrig på
-- duken (det skulle bryta principen "signal dold för skytten").
--
-- I prototypen drivs signalerna via Wizard-of-Oz (facilitator klickar
-- knappar i /wizard). När riktigt realtids-API mot sensorerna byggs
-- ersätter det manuella WoZ-input:et.

CREATE TABLE public.dar_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (section IN ('idt', 'odt', 'live_fire', 'qm360')),
  lane_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('green', 'yellow', 'red')),
  -- Valfri text — vad signalen handlar om (instruktörens cue, Pass 5
  -- använder den inte aktivt; Pass 6 (AAR) kan plocka upp det som
  -- pick-up-line-seed).
  reason TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (session_id, lane_number)
);

ALTER TABLE public.dar_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access for prototype" ON public.dar_signals
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_dar_signals_updated_at
  BEFORE UPDATE ON public.dar_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime så tablet ser wizard:s skrivningar live.
ALTER PUBLICATION supabase_realtime ADD TABLE public.dar_signals;

-- Index för "alla signaler för aktiv session", vanligaste queryn.
CREATE INDEX dar_signals_by_session ON public.dar_signals (session_id);
