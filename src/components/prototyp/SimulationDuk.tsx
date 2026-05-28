import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildShotSequence, type Shot } from "@/services/shotSimulation";
import type { ExerciseListItem, Section } from "@/services/sessionService";
import { PhaseHints, type RemoteKeyHint } from "@/components/prototyp/PhaseHints";

// Fjärr-hints för exercise-fasen.
const EXERCISE_HINTS: RemoteKeyHint[] = [
  { keys: ["OK"], label: "end early", primary: true },
];

/**
 * Helhetsprototyp — SimulationDuk (Pass 4, omdesignad 2026-05-28).
 *
 * Per [beslut 2026-05-28]: duken visar inte längre en timer-platshållare
 * under exercise-fasen. Istället visar duken **papptavlor per bana** med
 * skott som dyker upp över tid — samma mönster som syns här följer med
 * in i AAR-vyn utan diskontinuitet.
 *
 * Designprincip: "rent" — INGA triage-färger på duken under övning.
 * Skotten är bara skott (träff = ifylld punkt, miss = ring). Färger
 * och tolkning är instruktörens privata skikt (DAR-tabletten).
 *
 * Lane UI är inte längre en overlay-toggle — det här ÄR Lane UI,
 * permanent under hela övningen. Det är vad alla i rummet ser.
 *
 * När en stand-in: i verklig drift visar duken Unity-spelet. Dessa
 * papptavlor är en test-rigg-affordance så testpersoner har något att
 * reagera på och så att DAR→AAR-kontinuiteten kan utvärderas.
 */

interface LaneInfo {
  lane_number: number;
  name: string | null;
  status: string;
}

interface LaneSequence extends LaneInfo {
  shots: Shot[];
  total_shots: number;
}

export function SimulationDuk({
  exercise,
  section,
  onEnd,
}: {
  exercise: ExerciseListItem | null;
  section: Section;
  onEnd: () => void;
}) {
  // Endast upptagna banor visas på duken under övning.
  const { data: lanes = [] } = useQuery({
    queryKey: ["sim-lanes-occupied", section],
    queryFn: async () => {
      const { data } = await supabase
        .from("lane_assignments")
        .select("lane_number,name,status")
        .eq("section", section)
        .eq("status", "occupied")
        .order("lane_number");
      return (data ?? []) as LaneInfo[];
    },
    staleTime: 30_000,
  });

  const totalMs = (exercise?.time_seconds ?? 60) * 1000;

  // Deterministisk skott-sekvens per bana — samma instans som AARDuk
  // konsumerar. Memoiseras på exercise + lanes så vi inte rebuildar
  // varje render.
  const sequences = useMemo<LaneSequence[]>(() => {
    if (!exercise) return [];
    return lanes.map((l) => {
      const seq = buildShotSequence(l.lane_number, exercise);
      return {
        ...l,
        shots: seq.shots,
        total_shots: seq.total_shots,
      };
    });
  }, [lanes, exercise]);

  // RAF-driven elapsed-räknare. Driver vilka skott som syns just nu.
  // Resettas när exercise byter (eller komponenten remountar).
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (!exercise) return;
    setElapsedMs(0);
    const start = performance.now();
    let rafId = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      setElapsedMs(elapsed);
      if (elapsed < totalMs) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [exercise?.id, totalMs]);

  // Auto-end när tiden runnit ut. onEnd är stabilt callback från DukShell.
  useEffect(() => {
    if (totalMs > 0 && elapsedMs >= totalMs) {
      onEnd();
    }
  }, [elapsedMs, totalMs, onEnd]);

  if (!exercise) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-white">
        <div className="text-4xl font-light">No exercise running</div>
      </div>
    );
  }

  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const mm = String(Math.floor(remainingMs / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0");

  return (
    <div className="flex-1 flex flex-col text-white">
      {/* Header — diskret kontext + nedräkning */}
      <div className="grid grid-cols-3 items-baseline px-12 pt-10 pb-6">
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.4em] text-white/40">
          <span className="w-1.5 h-1.5 rounded-full bg-status-attention animate-pulse" />
          <span>Live · Exercise running</span>
        </div>
        <div className="text-center text-[11px] uppercase tracking-[0.3em] text-white/40 font-mono truncate">
          {exercise.title}
        </div>
        <div className="text-right text-[11px] uppercase tracking-[0.3em] text-white/40 font-mono tabular-nums">
          {mm}:{ss}
        </div>
      </div>

      {/* Lanes-vyn — papptavlor sida vid sida */}
      <div
        className="flex-1 px-8 pb-8 grid gap-6 items-end"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, sequences.length)}, minmax(0, 1fr))`,
        }}
      >
        {sequences.map((lane) => (
          <LaneTarget
            key={lane.lane_number}
            laneNumber={lane.lane_number}
            name={lane.name}
            shots={lane.shots.filter((s) => s.at_ms <= elapsedMs)}
            totalShots={lane.total_shots}
          />
        ))}
        {sequences.length === 0 && (
          <div className="col-span-full flex items-center justify-center text-white/30 text-lg">
            No lanes occupied.
          </div>
        )}
      </div>

      <PhaseHints hints={EXERCISE_HINTS} />
    </div>
  );
}

function LaneTarget({
  laneNumber,
  name,
  shots,
  totalShots,
}: {
  laneNumber: number;
  name: string | null;
  shots: Shot[];
  totalShots: number;
}) {
  // Respektera prefers-reduced-motion — visa skotten direkt utan
  // scale-in-animation om användaren bett om mindre rörelse.
  const prefersReducedMotion = useReducedMotion();
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full max-w-[280px] aspect-square">
        <svg
          viewBox="-50 -50 100 100"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Papptavlan — beige/varm-grå fond med subtila ringar */}
          <circle cx="0" cy="0" r="48" fill="#1c1c26" stroke="#33334a" strokeWidth="0.4" />
          <circle cx="0" cy="0" r="36" fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.4" />
          <circle cx="0" cy="0" r="25" fill="none" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="0.4" />
          <circle cx="0" cy="0" r="14" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="0.4" />
          <circle cx="0" cy="0" r="2.5" fill="#ffffff" fillOpacity="0.18" />
          {/* Center cross-hair */}
          <line x1="-4" y1="0" x2="4" y2="0" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="0.3" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="0.3" />

          <AnimatePresence>
            {shots.map((shot) => (
              <motion.g
                key={shot.i}
                initial={prefersReducedMotion ? { opacity: 1 } : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: "easeOut" }}
              >
                {shot.hit ? (
                  // Träff — solid vit punkt (papp-genomslag)
                  <>
                    <circle cx={shot.x} cy={shot.y} r="2.6" fill="#ffffff" opacity="0.92" />
                    <circle cx={shot.x} cy={shot.y} r="3.6" fill="none" stroke="#ffffff" strokeOpacity="0.20" strokeWidth="0.4" />
                  </>
                ) : (
                  // Miss — tunn ring (skott som inte träffade tavlan)
                  <circle
                    cx={shot.x}
                    cy={shot.y}
                    r="1.8"
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity="0.45"
                    strokeWidth="0.5"
                  />
                )}
              </motion.g>
            ))}
          </AnimatePresence>
        </svg>
      </div>
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
          Lane {laneNumber}
        </div>
        <div className="text-base text-white/85 truncate max-w-[220px]">
          {name ?? "—"}
        </div>
        <div className="text-[10px] font-mono text-white/30 mt-1 tabular-nums">
          {shots.length} / {totalShots} shots
        </div>
      </div>
    </div>
  );
}
