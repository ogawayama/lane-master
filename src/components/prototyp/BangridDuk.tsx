import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, AlertTriangle, Check, ChevronRight, Play } from "lucide-react";
import type { LaneAssignment, Section } from "@/services/assignmentService";
import {
  aggregateLaneStatus,
  deriveAlerts,
  type ReadinessIndicator,
  type ReadinessStatus,
} from "@/services/readinessService";
import { useLastRemoteEvent } from "@/hooks/useRemoteControl";
import type { ExerciseListItem } from "@/services/sessionService";

/**
 * Helhetsprototyp — BangridDuk (Pass 1 + Pass 1.5 + iteration 2026-05-26).
 *
 * Duken under check-in-fasen. Gör DUBBEL TJÄNST:
 *  1. Visa vem som checkat in (bangrid fylls upp i takt med RFID-blippar)
 *  2. Visa per-bana readiness (vapen / batteri / ammo / comms) så
 *     skyttarna kan självkorrigera
 *
 * Iteration efter user-feedback 2026-05-26:
 *   • Bannummer centrerade ovanför kortet (matchar wireframen, mindre kollision)
 *   • Issue-label per kort vid non-ok (instruktör ser VAD som är fel, inte bara ATT)
 *   • Visuell NEXT-knapp bottom-right — affordans för fjärr-OK, inte klickbar
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

// Per-kort issue-label — kort, glance:able. Återanvänds även av
// top-right-alerts indirekt (de använder deriveAlerts:s grupperade text).
const ISSUE_LABEL: Record<ReadinessIndicator, { warning: string; critical: string }> = {
  weapon: { warning: "Weapon issue", critical: "Weapon offline" },
  battery: { warning: "Battery low", critical: "Battery critical" },
  ammo: { warning: "Ammo low", critical: "Ammo critical" },
  comms: { warning: "Wifi unstable", critical: "Wifi offline" },
};

const INDICATOR_ORDER: ReadinessIndicator[] = ["weapon", "battery", "ammo", "comms"];

interface LaneIssue {
  indicator: ReadinessIndicator;
  severity: "warning" | "critical";
}

/**
 * Returnera ALLA non-ok issues för en lane, sorterade critical → warning,
 * och inom samma severity i INDICATOR_ORDER. En lane kan ha flera samtidigt
 * (t.ex. både battery low och wifi unstable) — alla ska synas på kortet
 * (per user-feedback 2026-05-26: det finns gott om vertikalt utrymme).
 */
function allIssues(lane: LaneAssignment): LaneIssue[] {
  const issues: LaneIssue[] = [];
  for (const sev of ["critical", "warning"] as const) {
    for (const ind of INDICATOR_ORDER) {
      const status = (lane[`${ind}_status` as const] ?? "na") as ReadinessStatus;
      if (status === sev) issues.push({ indicator: ind, severity: sev });
    }
  }
  return issues;
}

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

  const someOneCheckedIn = occupiedCount > 0;
  const allReady = someOneCheckedIn && alerts.length === 0;
  const nonReadyCount = alerts.length === 0
    ? 0
    : new Set(alerts.flatMap((a) => a.affectedLanes)).size;

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
                    Lane {a.affectedLanes.join(", Lane ")}
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
          className="grid gap-x-5 gap-y-3 w-full max-w-[1600px]"
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

      {/* Bottom action row — instruction + NEXT button */}
      <div className="flex items-center justify-between mt-8 px-2">
        <div className="text-white/40 text-sm tracking-wide">
          {!someOneCheckedIn
            ? "Tap your RFID on the check-in tablet to take a lane."
            : !allReady
              ? `${nonReadyCount} lane${nonReadyCount === 1 ? "" : "s"} not ready — review before starting.`
              : "All ready."}
        </div>
        <NextButton enabled={someOneCheckedIn} allReady={allReady} />
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
  const issues = occupied ? allIssues(lane) : [];

  return (
    <div className="flex flex-col items-center">
      {/* Lane number badge — centered above the card */}
      <div className="w-12 h-12 rounded-xl bg-amber-400 text-black flex items-center justify-center text-2xl font-bold tabular-nums shadow-lg mb-[-12px] z-10">
        {lane.lane_number}
      </div>

      {/* Card */}
      <motion.div
        layout
        className="relative w-full rounded-2xl border border-white/10 bg-white/[0.03] pt-8 px-5 pb-5 flex flex-col min-h-[260px]"
      >
        <div className="flex flex-col flex-1 items-center text-center">
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

          {/* Issue-labels — en chip per non-ok indikator. Stackade vertikalt
              (per user-feedback 2026-05-26: en lane kan ha flera samtidiga). */}
          {issues.length > 0 && (
            <div className="mt-2 w-full flex flex-col gap-1.5">
              <AnimatePresence>
                {issues.map((issue) => (
                  <motion.div
                    key={`${issue.indicator}-${issue.severity}`}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className={`w-full flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-medium ${
                      issue.severity === "critical"
                        ? "bg-red-500/10 text-red-300 border border-red-500/30"
                        : "bg-amber-400/10 text-amber-200 border border-amber-400/30"
                    }`}
                  >
                    {issue.severity === "critical" ? (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">{ISSUE_LABEL[issue.indicator][issue.severity]}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
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

/**
 * NEXT-knapp som affordans för fjärr-OK. INTE klickbar — duken ska
 * inte ha mus-element (spår 05 §Beslut 2026-05-25). Glow:ar kort när
 * fjärr-OK trycks så det syns att knappen reagerar.
 */
function NextButton({ enabled, allReady }: { enabled: boolean; allReady: boolean }) {
  const last = useLastRemoteEvent();
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (last?.event !== "ok" || !enabled) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 400);
    return () => clearTimeout(t);
  }, [last, enabled]);

  const tone = !enabled
    ? "border-white/10 text-white/30 bg-white/[0.02]"
    : allReady
      ? "border-emerald-500/40 text-emerald-200 bg-emerald-500/5"
      : "border-amber-400/40 text-amber-200 bg-amber-400/5";

  return (
    <div
      aria-hidden
      className={`flex items-center gap-4 rounded-xl border px-6 py-3 select-none transition-all duration-200 ${tone} ${
        flash ? "scale-[1.03] brightness-125" : ""
      }`}
    >
      <Play className="h-5 w-5" />
      <div className="flex flex-col items-start">
        <div className="text-lg font-medium tracking-tight">Next</div>
        <div className="text-[10px] uppercase tracking-[0.3em] opacity-70">
          Press OK on remote
        </div>
      </div>
      <ChevronRight className="h-4 w-4 opacity-60 ml-1" />
    </div>
  );
}
