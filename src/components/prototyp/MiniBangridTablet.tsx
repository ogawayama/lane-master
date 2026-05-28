import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  fetchAllLanes,
  type LaneAssignment,
  type Section as LaneSection,
} from "@/services/assignmentService";
import { subscribeLaneAssignments, unsubscribe } from "@/services/realtimeService";
import {
  aggregateLaneStatus,
  type ReadinessStatus,
} from "@/services/readinessService";

/**
 * Helhetsprototyp — MiniBangridTablet (UX-iteration 2026-05-28).
 *
 * Mini-version av BangridDuk som speglas på instruktörens tablet under
 * check-in-fasen. Per UX-review: tabletten ska *visa* vad som händer på
 * duken så instruktören inte behöver titta upp.
 *
 * Skillnader mot BangridDuk:
 *   • Kompakt: 5–10 banor på iPad-bredd utan att skrolla
 *   • Bara lane + name + status-färg (readiness-detaljer ligger
 *     fortfarande på duken — tabletten visar bara helhetstillståndet)
 *   • READ-ONLY: tabletten driver INTE check-in-flödet, fjärren gör det
 *
 * Designspråk: "kontrollrum" — tät, status-bärande.
 */

interface MiniBangridProps {
  section: LaneSection;
}

const STATUS_TINT: Record<ReadinessStatus, string> = {
  na: "border-border bg-card",
  ok: "border-status-success/40 bg-status-success/5",
  warning: "border-status-warning/50 bg-status-warning/8",
  critical: "border-status-attention/50 bg-status-attention/8",
};

const STATUS_DOT: Record<ReadinessStatus, string> = {
  na: "bg-white/15",
  ok: "bg-status-success",
  warning: "bg-status-warning",
  critical: "bg-status-attention",
};

export function MiniBangridTablet({ section }: MiniBangridProps) {
  const [lanes, setLanes] = useState<LaneAssignment[]>([]);
  useEffect(() => {
    void fetchAllLanes(section).then(setLanes);
    const channel = subscribeLaneAssignments(section, setLanes);
    return () => unsubscribe(channel);
  }, [section]);

  const occupied = lanes.filter((l) => l.status === "occupied").length;
  const total = lanes.length;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          On the projector now · Check-in
        </div>
        <div className="text-sm font-mono tabular-nums">
          {occupied} / {total}
        </div>
      </div>

      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.min(total, 5)}, minmax(0, 1fr))`,
        }}
      >
        <AnimatePresence>
          {lanes.map((lane) => {
            const readiness: ReadinessStatus =
              lane.status === "occupied"
                ? aggregateLaneStatus({
                    weapon_status: (lane.weapon_status ?? "ok") as ReadinessStatus,
                    battery_status: (lane.battery_status ?? "ok") as ReadinessStatus,
                    ammo_status: (lane.ammo_status ?? "ok") as ReadinessStatus,
                    comms_status: (lane.comms_status ?? "ok") as ReadinessStatus,
                  })
                : "na";
            const occupiedHere = lane.status === "occupied";
            return (
              <motion.div
                key={lane.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className={`relative rounded-lg border px-2.5 py-3 ${STATUS_TINT[readiness]}`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    L{lane.lane_number}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[readiness]}`} />
                </div>
                <div
                  className={`mt-1 text-xs font-medium truncate ${
                    occupiedHere ? "text-foreground" : "text-muted-foreground/40"
                  }`}
                >
                  {occupiedHere ? lane.name : "—"}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="mt-3 text-[10px] text-muted-foreground text-center">
        Mirrors the duk · drive with the remote
      </div>
    </div>
  );
}
