import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  computeResult,
  sortByPriority,
  type AARResult,
  type Status,
} from "@/services/aarResults";
import type { ExerciseListItem, Section } from "@/services/sessionService";

/**
 * Helhetsprototyp — MiniAARTablet (UX-iteration 2026-05-28).
 *
 * Mini-version av AAR-overview som speglas på instruktörens tablet
 * under aar-fasen. Read-only — fjärren driver duken; tabletten visar
 * helhetstillståndet kompakt för coaching-stöd.
 *
 * Designspråk: "kontrollrum" — tabletten talar i siffror och färger,
 * inte stora hero-block. För drill-down → fjärr → duk:s zoom-vy.
 */

interface LaneInfo {
  lane_number: number;
  name: string | null;
  weapon_name: string | null;
  status: string;
}

const STATUS_TINT: Record<Status, string> = {
  red: "border-status-attention/50 bg-status-attention/8 text-status-attention",
  yellow: "border-status-warning/40 bg-status-warning/8 text-status-warning",
  green: "border-status-success/30 bg-status-success/5 text-status-success",
};

const STATUS_DOT: Record<Status, string> = {
  red: "bg-status-attention",
  yellow: "bg-status-warning",
  green: "bg-status-success",
};

export function MiniAARTablet({
  exercise,
  section,
}: {
  exercise: ExerciseListItem | null;
  section: Section;
}) {
  const [lanes, setLanes] = useState<LaneInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("lane_assignments")
      .select("lane_number,name,weapon_name,status")
      .eq("section", section)
      .eq("status", "occupied")
      .order("lane_number")
      .then(({ data }) => {
        if (!cancelled) setLanes((data ?? []) as LaneInfo[]);
      });
    return () => {
      cancelled = true;
    };
  }, [section]);

  const results = useMemo<AARResult[]>(() => {
    if (!exercise) return [];
    return sortByPriority(
      lanes.map((l) =>
        computeResult(l.lane_number, l.name, l.weapon_name, exercise),
      ),
    );
  }, [lanes, exercise]);

  if (!exercise) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
        No exercise to review.
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
        No trainees on the lanes.
      </div>
    );
  }

  const reds = results.filter((r) => r.reds.length > 0).length;
  const yellows = results.filter((r) => r.yellows.length > 0 && r.reds.length === 0).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          On the projector now · AAR
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-attention" />
            {reds}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-warning" />
            {yellows}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {results.map((r) => {
          const worst: Status =
            r.reds.length > 0 ? "red" : r.yellows.length > 0 ? "yellow" : "green";
          return (
            <motion.div
              key={r.lane}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className={`rounded-lg border px-3 py-2 ${STATUS_TINT[worst]}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[worst]} shrink-0`} />
                  <span className="text-[10px] font-mono opacity-60 tabular-nums shrink-0">
                    L{r.lane}
                  </span>
                  <span className="text-sm text-foreground truncate">{r.trainee ?? "—"}</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono shrink-0 opacity-80">
                  <span title="Hits">{r.hits}</span>
                  <span title="Time">{r.time_seconds}s</span>
                  <span title="Spread">{r.spread_cm}cm</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-3 text-[10px] text-muted-foreground text-center">
        Mirrors the duk · use ◀ ▶ remote to focus, OK to zoom
      </div>
    </div>
  );
}
