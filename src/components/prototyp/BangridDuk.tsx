import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, AlertTriangle, Check } from "lucide-react";
import type { LaneAssignment, Section } from "@/services/assignmentService";
import {
  aggregateLaneStatus,
  deriveAlerts,
  type ReadinessStatus,
} from "@/services/readinessService";
import type { ExerciseListItem } from "@/services/sessionService";

/**
 * Helhetsprototyp — BangridDuk (Pass 1 + Pass 1.5).
 *
 * Duken under check-in-fasen. Gör DUBBEL TJÄNST:
 *  1. Visa vem som checkat in (bangrid fylls upp i takt med RFID-blippar)
 *  2. Visa per-bana readiness (vapen / batteri / ammo / comms) så
 *     skyttarna kan självkorrigera
 *
 * Per feedback 2026-05-26: layouten matchar wireframen — exercise-
 * kontext top-left, härledda system-alerts top-right (visas bara om
 * något är icke-ok), lane-grid med status-bar + vapen-rad-ikon.
 *
 * Designspråk: "biograf" — alla ser samma vy, ingen control-room-densitet.
 */

// Lane-status-färger på baren
const BAR_COLOR: Record<ReadinessStatus, string> = {
  na: "bg-white/10",
  ok: "bg-emerald-500",
  warning: "bg-amber-400",
  critical: "bg-red-500",
};

const WEAPON_ICON_COLOR: Record<ReadinessStatus, string> = {
  na: "text-white/30",
  ok: "text-emerald-400",
  warning: "text-amber-400",
  critical: "text-red-500",
};

const ALERT_INDICATOR_LABEL: Record<string, string> = {
  weapon: "Lane",
  battery: "Lane",
  ammo: "Ammo below spec",
  comms: "Lane",
};

export function BangridDuk({
  section,
  exercise,
  lanes,
}: {
  section: Section;
  exercise: ExerciseListItem | null;
  lanes: LaneAssignment[];
}) {
  // Härledda alerts (top-right). Endast occupied lanes räknas.
  const alerts = useMemo(() => {
    const occupied = lanes
      .filter((l) => l.status === "occupied")
      .map((l) => ({
        lane_number: l.lane_number,
        weapon_status: (l.weapon_status ?? "na") as ReadinessStatus,
        battery_status: (l.battery_status ?? "na") as ReadinessStatus,
        ammo_status: (l.ammo_status ?? "na") as ReadinessStatus,
        comms_status: (l.comms_status ?? "na") as ReadinessStatus,
      }));
    return deriveAlerts(occupied);
  }, [lanes]);

  const occupiedCount = lanes.filter((l) => l.status === "occupied").length;
  const totalCount = lanes.length;
  const cols = totalCount <= 5 ? Math.max(totalCount, 1) : Math.ceil(totalCount / 2);

  return (
    <div className="flex flex-col h-full w-full p-8 text-white">
      {/* Header — exercise context (left) + system alerts (right) */}
      <header className="flex items-start justify-between gap-8 mb-10">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-[0.3em] text-white/40 mb-2">
            Check-in · {section.replace("_", " ").toUpperCase()}
            {totalCount > 0 && (
              <span className="ml-3 font-mono">{occupiedCount} / {totalCount}</span>
            )}
          </div>
          {exercise ? (
            <>
              <h1 className="text-5xl font-light tracking-tight leading-[1.05]">
                {exercise.title}
              </h1>
              <div className="text-sm text-white/40 mt-2 max-w-xl">
                Trainees check in · weapons warm up · review status before start
              </div>
            </>
          ) : (
            <h1 className="text-5xl font-light tracking-tight leading-[1.05]">
              Waiting for check-in
            </h1>
          )}
        </div>

        {/* Top-right alerts — visas bara om något är non-ok */}
        <div className="flex flex-wrap gap-3 justify-end max-w-[55%]">
          <AnimatePresence>
            {alerts.map((a) => (
              <motion.div
                key={`${a.indicator}-${a.severity}`}
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 max-w-[18rem] ${
                  a.severity === "critical"
                    ? "border-red-500/50 bg-red-500/5"
                    : "border-amber-400/50 bg-amber-400/5"
                }`}
              >
                <div className="pt-0.5 shrink-0">
                  {a.severity === "critical" ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{a.label}</div>
                  <div className="text-[11px] text-white/50 mt-0.5">
                    {ALERT_INDICATOR_LABEL[a.indicator] === "Lane"
                      ? `Issue detected on: Lane ${a.affectedLanes.join(", Lane ")}`
                      : `Ammo below spec: Lane ${a.affectedLanes.join(", Lane ")}`}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </header>

      {/* Lane grid */}
      <div className="flex-1 flex items-center justify-center">
        <div
          className="grid gap-5 w-full max-w-[1600px]"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {lanes.length === 0 && (
            <div className="col-span-full text-center text-white/30 text-xl">
              No lanes configured for this section yet.
            </div>
          )}
          {lanes.map((lane) => (
            <LaneTile key={lane.id} lane={lane} />
          ))}
        </div>
      </div>

      {/* Bottom hint */}
      <div className="text-center text-white/40 text-sm tracking-wide mt-8">
        {occupiedCount === 0
          ? "Tap your RFID on the check-in tablet to take a lane."
          : occupiedCount < totalCount
            ? "Tap your RFID on the check-in tablet to take a lane."
            : alerts.length === 0
              ? "All ready · Press OK on the remote to start."
              : "Press OK to start (some lanes are not ready)."}
      </div>
    </div>
  );
}

function LaneTile({ lane }: { lane: LaneAssignment }) {
  const occupied = lane.status === "occupied";
  const readiness: ReadinessStatus = occupied
    ? aggregateLaneStatus({
        weapon_status: (lane.weapon_status ?? "ok") as ReadinessStatus,
        battery_status: (lane.battery_status ?? "ok") as ReadinessStatus,
        ammo_status: (lane.ammo_status ?? "ok") as ReadinessStatus,
        comms_status: (lane.comms_status ?? "ok") as ReadinessStatus,
      })
    : "na";

  const weaponStatus: ReadinessStatus = (lane.weapon_status ?? "na") as ReadinessStatus;

  return (
    <motion.div
      layout
      className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col min-h-[260px]"
    >
      {/* Lane number badge top-left (per wireframe) */}
      <div className="absolute -top-3 -left-3 w-12 h-12 rounded-xl bg-amber-400 text-black flex items-center justify-center text-2xl font-bold tabular-nums shadow-lg">
        {lane.lane_number}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 items-center text-center pt-3">
        {/* Name + rank */}
        <div className={`text-xl font-medium leading-tight ${occupied ? "text-white" : "text-white/25"} truncate max-w-full`}>
          {occupied ? lane.name : "—"}
        </div>
        <div className="text-[11px] text-white/40 mt-0.5">
          {occupied ? "Rank" : "Empty"}
        </div>

        {/* Status bar */}
        <div className={`mt-5 h-1.5 w-full rounded-full ${BAR_COLOR[readiness]} transition-colors duration-500`} />

        {/* Weapon row */}
        <div className="mt-auto pt-5 w-full">
          {occupied ? (
            <WeaponRow
              weaponName={lane.weapon_name ?? "—"}
              weaponType={lane.weapon_type ?? ""}
              weaponStatus={weaponStatus}
            />
          ) : (
            <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] text-white/30">
              Waiting for assignment
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function WeaponRow({
  weaponName,
  weaponType,
  weaponStatus,
}: {
  weaponName: string;
  weaponType: string;
  weaponStatus: ReadinessStatus;
}) {
  const Icon =
    weaponStatus === "critical"
      ? AlertCircle
      : weaponStatus === "warning"
        ? AlertTriangle
        : Check;
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left">
      <Icon className={`h-4 w-4 shrink-0 ${WEAPON_ICON_COLOR[weaponStatus]}`} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{weaponName}</div>
        {weaponType && (
          <div className="text-[10px] text-white/50 truncate">{weaponType}</div>
        )}
      </div>
    </div>
  );
}
