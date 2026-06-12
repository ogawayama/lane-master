import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { clearAllSignals } from "@/services/darService";

/**
 * Helhetsprototyp — sessionService (Pass 0).
 *
 * Sessions-tabellen är ett state-machine-bord:
 *
 *   idle → prepare → check-in → preflight → exercise → aar
 *                                      ↑               │
 *                                      └─ next ────────┘
 *                                                      │
 *                                              switch trainee
 *                                                      ↓
 *                                                    ended
 *
 * /tablet (instruktören) och /wizard (facilitator) skriver phase.
 * /duk läser och renderar olika beroende på phase.
 *
 * Allt mutationsanrop muteras på "active session" (där phase ≠ idle/ended)
 * — vi har en seedad idle session per section.
 */

export type SessionPhase =
  | "idle"
  | "prepare"
  | "select-exercise"
  | "check-in"
  | "preflight"
  | "exercise"
  | "aar"
  | "ended";

export type Section = "idt" | "odt" | "live_fire" | "qm360";

export interface ExerciseListItem {
  id: string;
  title: string;
  weapon?: string;
  image?: string;
  hits_threshold?: number;
  time_seconds?: number;
  spread_threshold?: number;
}

export interface SessionRow {
  id: string;
  section: Section;
  phase: SessionPhase;
  exercise_list: ExerciseListItem[];
  current_exercise_index: number;
  current_trainee_id: number | null;
  lane_ui_visible: boolean;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

// Note: types.ts is Lovable-auto-generated; the new `sessions` table won't
// appear there until next regeneration. Cast through unknown to bypass.
const sessionsTable = () => supabase.from("sessions" as never) as never;

/** Tysta fel är testgift — facilitatorn måste se när en write failar.
 *  Loggar + visar toast (Sonner är monterad i App.tsx). */
function reportError(op: string, message: string) {
  console.warn(`${op} failed:`, message);
  toast.error(`${op} failed — ${message}`);
}

/** Get the most relevant session for a section — active one first, else idle. */
export async function getCurrentSession(
  section: Section,
): Promise<SessionRow | null> {
  const { data, error } = await (sessionsTable() as any)
    .select("*")
    .eq("section", section)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    reportError("getCurrentSession", error.message);
    return null;
  }
  return (data as SessionRow) ?? null;
}

/** Drive the state machine. Wizard panel + tablet share this surface.
 *  `expectPhase` gör övergången villkorad (optimistisk låsning) — en
 *  dubbel fjärrtryckning vars första write redan flyttat fasen blir
 *  då en no-op i stället för ett tyst dubbelhopp. */
export async function setPhase(
  sessionId: string,
  phase: SessionPhase,
  expectPhase?: SessionPhase,
): Promise<void> {
  const patch: Record<string, unknown> = { phase };
  if (phase === "check-in" || phase === "prepare") {
    patch.started_at = new Date().toISOString();
  }
  if (phase === "ended") {
    patch.ended_at = new Date().toISOString();
  }
  let query = (sessionsTable() as any).update(patch).eq("id", sessionId);
  if (expectPhase) query = query.eq("phase", expectPhase);
  const { error } = await query;
  if (error) reportError("setPhase", error.message);
}

/** Set the curated exercise list (consumed by Pass 2 — pre-pass preparation). */
export async function setExerciseList(
  sessionId: string,
  list: ExerciseListItem[],
): Promise<void> {
  const { error } = await (sessionsTable() as any)
    .update({ exercise_list: list, current_exercise_index: 0 })
    .eq("id", sessionId);
  if (error) reportError("setExerciseList", error.message);
}

/** Atomically pick which exercise to start with (Chromecast picker) and
 *  transition to check-in. Per user-beslut 2026-05-26 Q1 (skip ahead, no wrap):
 *  current_exercise_index sätts; från picked till listans slut körs i sekvens. */
export async function pickStartExercise(
  sessionId: string,
  index: number,
): Promise<void> {
  const { error } = await (sessionsTable() as any)
    .update({ current_exercise_index: index, phase: "check-in" })
    .eq("id", sessionId);
  if (error) reportError("pickStartExercise", error.message);
}

/** Move to next exercise in the list. Loops via phase=preflight again.
 *  Guardad på nuvarande index — två snabba HoldOK i AAR ger ett steg,
 *  inte två (den andra writen matchar inte längre och blir no-op). */
export async function advanceToNextExercise(
  sessionId: string,
  currentIndex: number,
): Promise<void> {
  const { error } = await (sessionsTable() as any)
    .update({
      current_exercise_index: currentIndex + 1,
      phase: "preflight",
    })
    .eq("id", sessionId)
    .eq("current_exercise_index", currentIndex)
    .eq("phase", "aar");
  if (error) reportError("advanceToNextExercise", error.message);
}

/** Toggle Lane UI overlay (Pass 4). */
export async function toggleLaneUi(
  sessionId: string,
  visible: boolean,
): Promise<void> {
  const { error } = await (sessionsTable() as any)
    .update({ lane_ui_visible: visible })
    .eq("id", sessionId);
  if (error) reportError("toggleLaneUi", error.message);
}

/** Create a fresh idle session for a section. Wizard fallback when there
 *  is no existing session row — bootstraps the state machine.
 *  Per UX-review 2026-05-28: tidigare hängde wizard:n i "Loading…" om
 *  ingen session existerade och alla knappar var disabled. */
export async function createIdleSession(section: Section): Promise<void> {
  const { error } = await (sessionsTable() as any).insert({
    section,
    phase: "idle",
    exercise_list: [],
    current_exercise_index: 0,
    current_trainee_id: null,
    lane_ui_visible: false,
  });
  if (error) reportError("createIdleSession", error.message);
}

/** Reset a session back to idle (wizard panel — "start over").
 *  Rensar även dar_signals — sessionen återanvänder samma rad/id, så
 *  stale triage-färger från förra testpersonen skulle annars dyka upp
 *  direkt i nästa pass' exercise-fas. */
export async function resetSession(sessionId: string): Promise<void> {
  const { error } = await (sessionsTable() as any)
    .update({
      phase: "idle",
      exercise_list: [],
      current_exercise_index: 0,
      current_trainee_id: null,
      lane_ui_visible: false,
      started_at: null,
      ended_at: null,
    })
    .eq("id", sessionId);
  if (error) reportError("resetSession", error.message);
  await clearAllSignals(sessionId);
}
