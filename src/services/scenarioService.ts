import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Section } from "@/services/sessionService";
import type { DarStatus } from "@/services/darService";
import { EXERCISE_CATALOG } from "@/data/exerciseCatalog";

/**
 * Helhetsprototyp — scenarioService (Pass 8).
 *
 * Fördefinierat demo-scenario så facilitatorn bara följer scriptet:
 * tre skyttar, tre övningar, WoZ-beats per övning. Konsumeras av
 * ScenarioPanel i /wizard. Det mänskliga scriptet (rigg, steg,
 * observationspunkter) bor i GS-POM:
 * research/scenarioscript-helhetsprototyp.md.
 */

export interface ScenarioTrainee {
  lane: number;
  name: string;
  weapon_name: string;
  weapon_type: string;
}

export interface ScenarioBeat {
  /** Vilken övning (0-baserat index i scenariots exercise-lista) beatet hör till. */
  exerciseIndex: number;
  /** Ungefärlig tidpunkt relativt övningsstart — för facilitatorns timing. */
  cue: string;
  label: string;
  lane: number;
  status: DarStatus;
}

export const SCENARIO_TRAINEES: ScenarioTrainee[] = [
  { lane: 1, name: "A. Berg", weapon_name: "Falcon A", weapon_type: "Colt M4" },
  { lane: 2, name: "K. Lindh", weapon_name: "Falcon B", weapon_type: "Colt M4" },
  { lane: 3, name: "S. Holm", weapon_name: "Viper A", weapon_type: "AR15" },
];

export const SCENARIO_EXERCISE_IDS = [
  "basic-ar15-paper",
  "adv-3d-rifle",
  "combat-room-clear",
];

export const SCENARIO_EXERCISES = EXERCISE_CATALOG.filter((ex) =>
  SCENARIO_EXERCISE_IDS.includes(ex.id),
).map((ex) => ({
  id: ex.id,
  title: ex.title,
  weapon: ex.weaponTypes[0],
  image: ex.image,
  hits_threshold: ex.hits_threshold,
  time_seconds: ex.time_seconds,
  spread_threshold: ex.spread_threshold,
}));

/** WoZ-beats: övning 1 ren (baslinje), övning 2 gul + recovery (tolkar
 *  instruktören signalen utan att överreagera?), övning 3 röd som
 *  ligger kvar (prioriterar instruktören rätt bana i AAR?). */
export const SCENARIO_BEATS: ScenarioBeat[] = [
  { exerciseIndex: 1, cue: "~20 s in", label: "Lane 2 needs support", lane: 2, status: "yellow" },
  { exerciseIndex: 1, cue: "~35 s in", label: "Lane 2 recovers", lane: 2, status: "green" },
  { exerciseIndex: 2, cue: "~15 s in", label: "Lane 3 needs follow-up", lane: 3, status: "red" },
  { exerciseIndex: 2, cue: "~30 s in", label: "Lane 1 needs support", lane: 1, status: "yellow" },
];

/** Sätt fördefinierade skyttar på banorna — motsvarar att tre RFID-taggar
 *  blippats in. DB-triggern lane_readiness_sync sätter readiness till ok. */
export async function seedScenarioTrainees(section: Section): Promise<void> {
  for (const t of SCENARIO_TRAINEES) {
    const { error } = await supabase
      .from("lane_assignments")
      .update({
        name: t.name,
        weapon_name: t.weapon_name,
        weapon_type: t.weapon_type,
        status: "occupied",
        assigned_at: new Date().toISOString(),
      })
      .eq("section", section)
      .eq("lane_number", t.lane);
    if (error) {
      console.warn("seedScenarioTrainees failed:", error.message);
      toast.error(`seedScenarioTrainees failed — ${error.message}`);
      return;
    }
  }
}

// — Eventlogg (Pass 8: tidsstämplar + efter-test-analys) ————————————
// Wizarden ser alla realtime-händelser (fasbyten, WoZ, incheckningar,
// fjärrtryck via broadcast-bryggan) — loggen byggs därför där, med en
// enda klocka. Ingen DB-tabell behövs för prototypen.

export type ScenarioEventType =
  | "phase"
  | "exercise-index"
  | "remote"
  | "dar-signal"
  | "lane-occupancy"
  | "readiness"
  | "facilitator";

export interface ScenarioEvent {
  at: string; // ISO-tidsstämpel (wizard-maskinens klocka)
  type: ScenarioEventType;
  detail: string;
}

/** Härledda checkpoints per plan.md §5 Pass 8: när startade check-in,
 *  övning, AAR — plus antal ingrepp (WoZ-skrivningar). */
export function deriveCheckpoints(events: ScenarioEvent[]): {
  label: string;
  at: string;
}[] {
  const checkpoints: { label: string; at: string }[] = [];
  let exerciseNo = 0;
  for (const e of events) {
    if (e.type === "phase") {
      if (e.detail.endsWith("→ select-exercise")) checkpoints.push({ label: "Picker shown", at: e.at });
      if (e.detail.endsWith("→ check-in")) checkpoints.push({ label: "Check-in started", at: e.at });
      if (e.detail.endsWith("→ exercise")) {
        exerciseNo += 1;
        checkpoints.push({ label: `Exercise ${exerciseNo} started`, at: e.at });
      }
      if (e.detail.endsWith("→ aar")) checkpoints.push({ label: `AAR ${exerciseNo} started`, at: e.at });
      if (e.detail.endsWith("→ ended")) checkpoints.push({ label: "Session ended", at: e.at });
    }
  }
  return checkpoints;
}

export function exportLog(events: ScenarioEvent[]): string {
  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      checkpoints: deriveCheckpoints(events),
      interventions: events.filter((e) => e.type === "dar-signal" || e.type === "readiness").length,
      events,
    },
    null,
    2,
  );
}
