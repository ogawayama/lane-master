-- Helhetsprototyp Pass 1.5 — per-lane readiness status
--
-- Per [helhetsprototyp/plan.md] feedback 2026-05-26: bangrid:en under
-- check-in ska göra dubbel tjänst — först visa vem som checkat in,
-- sedan parallellt visa per-bana readiness (vapen / batteri / ammo /
-- comms). Skyttarna ser duken och kan självkorrigera (gå byta batteri,
-- koppla upp vapnet) medan instruktören väntar.
--
-- Fyra status-kolumner på lane_assignments. Aggregatet (grön/gul/röd-
-- baren i UI:t) beräknas i app:n; alerts-cards top-right härleds från
-- samma data grupperat per indikator-typ.
--
-- Värden: 'na' (lanen tom), 'ok', 'warning', 'critical'.
--
-- Trigger: när status→'occupied' sätts alla 4 till 'ok' (mock-default
-- per user-beslut 2026-05-26 a). När status→'empty' tillbaka till 'na'.
-- Trigger fires bara på UPDATE OF status så WoZ-skrivningar mot
-- t.ex. weapon_status inte trigger:ar reset.

ALTER TABLE public.lane_assignments
  ADD COLUMN weapon_status  TEXT NOT NULL DEFAULT 'na' CHECK (weapon_status  IN ('na', 'ok', 'warning', 'critical')),
  ADD COLUMN battery_status TEXT NOT NULL DEFAULT 'na' CHECK (battery_status IN ('na', 'ok', 'warning', 'critical')),
  ADD COLUMN ammo_status    TEXT NOT NULL DEFAULT 'na' CHECK (ammo_status    IN ('na', 'ok', 'warning', 'critical')),
  ADD COLUMN comms_status   TEXT NOT NULL DEFAULT 'na' CHECK (comms_status   IN ('na', 'ok', 'warning', 'critical'));

-- Backfill: existerande occupied lanes ska börja som all-green.
UPDATE public.lane_assignments
  SET weapon_status = 'ok',
      battery_status = 'ok',
      ammo_status = 'ok',
      comms_status = 'ok'
  WHERE status = 'occupied';

-- Trigger: håll readiness i synk med status-fältet.
CREATE OR REPLACE FUNCTION public.sync_lane_readiness()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT eller status-byte → 'occupied': initialisera all-green.
  IF NEW.status = 'occupied' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'occupied') THEN
    NEW.weapon_status  := 'ok';
    NEW.battery_status := 'ok';
    NEW.ammo_status    := 'ok';
    NEW.comms_status   := 'ok';
  -- Status-byte → 'empty': rensa till 'na'.
  ELSIF NEW.status = 'empty' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'empty') THEN
    NEW.weapon_status  := 'na';
    NEW.battery_status := 'na';
    NEW.ammo_status    := 'na';
    NEW.comms_status   := 'na';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER lane_readiness_sync
  BEFORE INSERT OR UPDATE OF status ON public.lane_assignments
  FOR EACH ROW EXECUTE FUNCTION public.sync_lane_readiness();
