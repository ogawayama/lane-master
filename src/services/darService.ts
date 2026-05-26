import { supabase } from "@/integrations/supabase/client";
import type { Section } from "@/services/sessionService";

/**
 * Helhetsprototyp — DAR signals (Pass 5).
 *
 * Driver röd/gul/grön per bana under exercise-fasen. Skrivs av
 * /wizard (Wizard-of-Oz), läses av /tablet (DARTablet).
 *
 * Per [spår 03] visas signalen ALDRIG på duken — bara på instruktörens
 * privata yta.
 */

export type DarStatus = "green" | "yellow" | "red";

export interface DarSignal {
  id: string;
  session_id: string;
  section: Section;
  lane_number: number;
  status: DarStatus;
  reason: string | null;
  updated_at: string;
}

const tbl = () => supabase.from("dar_signals" as never) as never;

export async function setSignal(
  sessionId: string,
  section: Section,
  lane: number,
  status: DarStatus,
  reason?: string,
): Promise<void> {
  // Upsert via (session_id, lane_number) — UNIQUE constraint i schema.
  const { error } = await (tbl() as any)
    .upsert(
      {
        session_id: sessionId,
        section,
        lane_number: lane,
        status,
        reason: reason ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,lane_number" },
    );
  if (error) console.warn("setSignal failed:", error.message);
}

export async function clearSignal(
  sessionId: string,
  lane: number,
): Promise<void> {
  const { error } = await (tbl() as any)
    .delete()
    .eq("session_id", sessionId)
    .eq("lane_number", lane);
  if (error) console.warn("clearSignal failed:", error.message);
}

export async function clearAllSignals(sessionId: string): Promise<void> {
  const { error } = await (tbl() as any).delete().eq("session_id", sessionId);
  if (error) console.warn("clearAllSignals failed:", error.message);
}

export async function getSignals(sessionId: string): Promise<DarSignal[]> {
  const { data, error } = await (tbl() as any)
    .select("*")
    .eq("session_id", sessionId)
    .order("lane_number");
  if (error) {
    console.warn("getSignals failed:", error.message);
    return [];
  }
  return (data as DarSignal[]) ?? [];
}
