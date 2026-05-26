import { supabase } from "@/integrations/supabase/client";

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
    console.warn("getCurrentSession failed:", error.message);
    return null;
  }
  return (data as SessionRow) ?? null;
}

/** Drive the state machine. Wizard panel + tablet share this surface. */
export async function setPhase(
  sessionId: string,
  phase: SessionPhase,
): Promise<void> {
  const patch: Record<string, unknown> = { phase };
  if (phase === "check-in" || phase === "prepare") {
    patch.started_at = new Date().toISOString();
  }
  if (phase === "ended") {
    patch.ended_at = new Date().toISOString();
  }
  const { error } = await (sessionsTable() as any).update(patch).eq("id", sessionId);
  if (error) console.warn("setPhase failed:", error.message);
}

/** Set the curated exercise list (consumed by Pass 2 — pre-pass preparation). */
export async function setExerciseList(
  sessionId: string,
  list: ExerciseListItem[],
): Promise<void> {
  const { error } = await (sessionsTable() as any)
    .update({ exercise_list: list, current_exercise_index: 0 })
    .eq("id", sessionId);
  if (error) console.warn("setExerciseList failed:", error.message);
}

/** Move to next exercise in the list. Loops via phase=preflight again. */
export async function advanceToNextExercise(
  sessionId: string,
  currentIndex: number,
): Promise<void> {
  const { error } = await (sessionsTable() as any)
    .update({
      current_exercise_index: currentIndex + 1,
      phase: "preflight",
    })
    .eq("id", sessionId);
  if (error) console.warn("advanceToNextExercise failed:", error.message);
}

/** Toggle Lane UI overlay (Pass 4). */
export async function toggleLaneUi(
  sessionId: string,
  visible: boolean,
): Promise<void> {
  const { error } = await (sessionsTable() as any)
    .update({ lane_ui_visible: visible })
    .eq("id", sessionId);
  if (error) console.warn("toggleLaneUi failed:", error.message);
}

/** Reset a session back to idle (wizard panel — "start over"). */
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
  if (error) console.warn("resetSession failed:", error.message);
}
