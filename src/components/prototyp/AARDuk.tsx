import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Timer, Crosshair, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  computeResult,
  sortByPriority,
  severityOf,
  type AARResult,
  type Status,
} from "@/services/aarResults";
import { pickCue, type Criterion } from "@/data/cueLibrary";
import type { ExerciseListItem, Section } from "@/services/sessionService";

/**
 * Helhetsprototyp — AARDuk (Pass 6).
 *
 * Duken under AAR-fasen. Per [spår 04 spårkort]:
 *   • Karusell-modell: cirkulär, fri ingångspunkt (instruktören väljer
 *     vilken röd skytt först), navigation = kvittering (ingen "klar")
 *   • Tre kriterie-kort per skytt (Hit / Time / Spread), färgade
 *     röd/gul/grön mot tröskelvärdena
 *   • Röda kort auto-expanderade med pick-up-line — instruktören
 *     riffar på den, läser inte upp den
 *   • Prioriteringsordning vid flera röda: HIT > TIME > SPREAD
 *
 * Designspråk: "biograf" — stor, lugn, en skytt i taget på duken.
 * Triage-kort renderas distinkt från DAR-triage (som bor på tablet).
 */

interface LaneInfo {
  lane_number: number;
  name: string | null;
  weapon_name: string | null;
  status: string;
}

const STATUS_TINT: Record<Status, string> = {
  red: "bg-red-500/10 border-red-500/40 text-red-300",
  yellow: "bg-amber-400/10 border-amber-400/40 text-amber-200",
  green: "bg-emerald-500/10 border-emerald-500/30 text-emerald-200",
};

const STATUS_DOT: Record<Status, string> = {
  red: "bg-red-500",
  yellow: "bg-amber-400",
  green: "bg-emerald-500",
};

export function AARDuk({
  exercise,
  section,
  currentIndex,
}: {
  exercise: ExerciseListItem | null;
  section: Section;
  currentIndex: number;
}) {
  // Hämta occupied lanes och bygg resultat per skytt.
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

  // currentIndex är clamp:ad och cyklisk via DukShell:s karusell-handler.
  const safeIndex = results.length > 0
    ? ((currentIndex % results.length) + results.length) % results.length
    : 0;
  const current = results[safeIndex];

  if (!exercise) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-white text-center px-12">
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">
          After Action Review
        </div>
        <div className="text-5xl font-light">No exercise to review</div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-white text-center px-12">
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">
          After Action Review
        </div>
        <div className="text-5xl font-light">No trainees on the lanes</div>
        <div className="mt-4 text-sm text-white/40">
          Press OK on the remote to continue.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col text-white">
      {/* Top — context */}
      <div className="flex items-baseline justify-between px-12 pt-12">
        <div className="text-[11px] uppercase tracking-[0.4em] text-white/40">
          After Action Review
        </div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-white/30 font-mono truncate max-w-[60%]">
          {exercise.title}
        </div>
      </div>

      {/* Hero — current trainee */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.lane}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex-1 grid grid-cols-[420px_1fr] gap-12 px-12 py-8"
        >
          {/* Left — trainee identity */}
          <div className="flex flex-col justify-center">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
              Lane {current.lane}
            </div>
            <div className="text-6xl font-light leading-none tracking-tight">
              {current.trainee ?? "—"}
            </div>
            <div className="mt-4 text-base text-white/40">
              {current.weapon ?? "—"}
            </div>
            {current.reds.length > 0 && (
              <div className="mt-8 inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[11px] uppercase tracking-[0.3em] text-red-300">
                  {current.reds.length} priority{current.reds.length > 1 ? "s" : ""} to work on
                </span>
              </div>
            )}
          </div>

          {/* Right — three criterion cards */}
          <div className="flex flex-col justify-center gap-3">
            <CriterionCard
              icon={<Target className="h-5 w-5" />}
              label="Hits"
              value={`${current.hits}`}
              threshold={`≥ ${exercise.hits_threshold ?? "—"}`}
              status={current.hit_status}
              cue={
                severityOf(current.hit_status)
                  ? pickCue(current.lane, exercise.id, "hit", severityOf(current.hit_status)!)
                  : null
              }
              expanded={current.hit_status === "red"}
            />
            <CriterionCard
              icon={<Timer className="h-5 w-5" />}
              label="Time"
              value={`${current.time_seconds}s`}
              threshold={`≤ ${exercise.time_seconds}s`}
              status={current.time_status}
              cue={
                severityOf(current.time_status)
                  ? pickCue(current.lane, exercise.id, "time", severityOf(current.time_status)!)
                  : null
              }
              expanded={current.time_status === "red"}
            />
            <CriterionCard
              icon={<Crosshair className="h-5 w-5" />}
              label="Spread"
              value={`${current.spread_cm} cm`}
              threshold={`≤ ${exercise.spread_threshold} cm`}
              status={current.spread_status}
              cue={
                severityOf(current.spread_status)
                  ? pickCue(current.lane, exercise.id, "spread", severityOf(current.spread_status)!)
                  : null
              }
              expanded={current.spread_status === "red"}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom — carousel indicator + hints */}
      <div className="px-12 pb-10">
        <div className="flex items-center justify-between mb-4">
          <CarouselDots count={results.length} active={safeIndex} statuses={results.map(r => r.reds.length > 0 ? "red" : r.yellows.length > 0 ? "yellow" : "green")} />
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-mono">
            {safeIndex + 1} / {results.length}
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 text-white/40 text-sm">
          <div className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            <ChevronRight className="h-4 w-4" />
            <span className="text-xs uppercase tracking-[0.3em]">between trainees</span>
          </div>
          <span className="text-white/20">·</span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-6 w-9 rounded border border-white/30 text-[10px] font-mono">
              OK
            </span>
            <span className="text-xs uppercase tracking-[0.3em]">next exercise</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CriterionCard({
  icon,
  label,
  value,
  threshold,
  status,
  cue,
  expanded,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  threshold: string;
  status: Status;
  cue: string | null;
  expanded: boolean;
}) {
  const tint = STATUS_TINT[status];
  const dot = STATUS_DOT[status];

  return (
    <div className={`rounded-2xl border ${tint} px-5 py-4 transition-all`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          {icon}
          <span className="text-[11px] uppercase tracking-[0.3em] opacity-80">
            {label}
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-light tabular-nums">{value}</span>
          <span className="text-xs opacity-60 font-mono">{threshold}</span>
        </div>
      </div>
      <AnimatePresence>
        {expanded && cue && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-white/10 text-base leading-snug">
              <div className="text-[10px] uppercase tracking-[0.3em] opacity-60 mb-1">
                Pick-up line
              </div>
              "{cue}"
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CarouselDots({
  count,
  active,
  statuses,
}: {
  count: number;
  active: number;
  statuses: Status[];
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === active;
        const s = statuses[i];
        const color = s === "red" ? "bg-red-500" : s === "yellow" ? "bg-amber-400" : "bg-emerald-500";
        return (
          <span
            key={i}
            className={`rounded-full transition-all ${
              isActive ? `${color} w-6 h-1.5` : "bg-white/20 w-1.5 h-1.5"
            }`}
          />
        );
      })}
    </div>
  );
}
