import { supabase } from "@/integrations/supabase/client";
import type { Section } from "@/services/assignmentService";

/**
 * Helhetsprototyp — readiness-status (Pass 1.5).
 *
 * Per-bana fyra indikatorer (weapon/battery/ammo/comms) plus ett
 * aggregat. Härledda studio-alerts (top-right på duken) grupperas
 * per indikator-typ från lanes som har non-ok.
 *
 * Aktivare:
 *   • Auto-default 'ok' när lane fylls (DB-trigger lane_readiness_sync)
 *   • WoZ-skrivningar från /wizard för scenario-test
 *
 * Auto-recovery: när WoZ flippar tillbaka till 'ok' försvinner
 * alert-cardet automatiskt — alerts är härledda, inte persisted.
 */

export type ReadinessIndicator = "weapon" | "battery" | "ammo" | "comms";
export type ReadinessStatus = "na" | "ok" | "warning" | "critical";

const INDICATORS: ReadinessIndicator[] = ["weapon", "battery", "ammo", "comms"];

const STATUS_RANK: Record<ReadinessStatus, number> = {
  na: 0,
  ok: 0,
  warning: 1,
  critical: 2,
};

/**
 * Worst-of aggregat: critical dominerar warning dominerar ok.
 * 'na' (empty lane) räknas som 'ok' i aggregat-sammanhang — vi vill
 * inte att en tom platshållare ska färga sin bar.
 */
export function aggregateLaneStatus(lane: {
  weapon_status: ReadinessStatus;
  battery_status: ReadinessStatus;
  ammo_status: ReadinessStatus;
  comms_status: ReadinessStatus;
}): ReadinessStatus {
  const ranks = [
    STATUS_RANK[lane.weapon_status],
    STATUS_RANK[lane.battery_status],
    STATUS_RANK[lane.ammo_status],
    STATUS_RANK[lane.comms_status],
  ];
  const max = Math.max(...ranks);
  if (max === 2) return "critical";
  if (max === 1) return "warning";
  return "ok";
}

export interface DerivedAlert {
  indicator: ReadinessIndicator;
  severity: "warning" | "critical";
  label: string;
  affectedLanes: number[];
}

const ALERT_LABEL: Record<ReadinessIndicator, { warning: string; critical: string }> = {
  weapon: {
    warning: "Weapon sensor issue",
    critical: "Weapon offline",
  },
  battery: {
    warning: "Low battery",
    critical: "Battery critically low",
  },
  ammo: {
    warning: "Ammunition below spec",
    critical: "Ammunition critically low",
  },
  comms: {
    warning: "Wi-Fi unstable",
    critical: "Wi-Fi disconnected",
  },
};

interface LaneStatusRow {
  lane_number: number;
  weapon_status: ReadinessStatus;
  battery_status: ReadinessStatus;
  ammo_status: ReadinessStatus;
  comms_status: ReadinessStatus;
}

/**
 * Härled alert-cards top-right från en lista lanes.
 * Grupperar per (indicator, severity) — så fyra lanes med
 * battery=warning blir EN alert "Low battery · Lanes 1, 3, 4, 5".
 * Auto-recovery: om en lane:s indikator flippar tillbaka till 'ok'
 * försvinner den från affectedLanes; om alla flippar tillbaka
 * försvinner alert:en helt.
 */
export function deriveAlerts(lanes: LaneStatusRow[]): DerivedAlert[] {
  const groups = new Map<string, { indicator: ReadinessIndicator; severity: "warning" | "critical"; lanes: number[] }>();

  for (const lane of lanes) {
    for (const ind of INDICATORS) {
      const status = lane[`${ind}_status` as const];
      if (status !== "warning" && status !== "critical") continue;
      const key = `${ind}:${status}`;
      const group = groups.get(key) ?? { indicator: ind, severity: status, lanes: [] };
      group.lanes.push(lane.lane_number);
      groups.set(key, group);
    }
  }

  // Stabilt sort:erad output: critical före warning, sen per indikator.
  const result: DerivedAlert[] = [];
  for (const sev of ["critical", "warning"] as const) {
    for (const ind of INDICATORS) {
      const g = groups.get(`${ind}:${sev}`);
      if (!g) continue;
      result.push({
        indicator: ind,
        severity: sev,
        label: ALERT_LABEL[ind][sev],
        affectedLanes: g.lanes.sort((a, b) => a - b),
      });
    }
  }
  return result;
}

/**
 * WoZ-skrivning från /wizard. Ändrar EN indikator för EN bana —
 * trigger:n hindras eftersom UPDATE OF status inte är involverad.
 */
export async function setLaneIndicator(
  section: Section,
  lane: number,
  indicator: ReadinessIndicator,
  status: ReadinessStatus,
): Promise<void> {
  const column = `${indicator}_status`;
  const { error } = await supabase
    .from("lane_assignments")
    .update({ [column]: status })
    .eq("section", section)
    .eq("lane_number", lane);
  if (error) console.warn(`setLaneIndicator(${indicator}) failed:`, error.message);
}

/** Återställ alla fyra indikatorer för en bana till 'ok'. */
export async function resetLaneToOk(
  section: Section,
  lane: number,
): Promise<void> {
  const { error } = await supabase
    .from("lane_assignments")
    .update({
      weapon_status: "ok",
      battery_status: "ok",
      ammo_status: "ok",
      comms_status: "ok",
    })
    .eq("section", section)
    .eq("lane_number", lane)
    .eq("status", "occupied"); // bara om lanen faktiskt är ifylld
  if (error) console.warn("resetLaneToOk failed:", error.message);
}
