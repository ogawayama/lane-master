import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ExerciseListItem, Section } from "@/services/sessionService";

/**
 * Helhetsprototyp — SimulationDuk (Pass 4).
 *
 * Vad detta är: en *platshållare* för Unity-simuleringen som driver
 * scenariot under en övning. Verkligheten = HDMI-källa byter från
 * 10-feet UI (instruktörsdatorn) till Unity. Här simulerar vi det
 * byte:t som ett vy-byte i webben.
 *
 * Per helhetsprototyp/plan.md §5 Pass 4:
 *   • Diskret platshållare ("EXERCISE RUNNING — MM:SS")
 *   • Countdown-timer från exercise.time_seconds
 *   • Auto-end vid 0 → onEnd-callback (DukShell sätter phase=aar)
 *   • Toggleable Lane UI overlay — träffmönster per bana
 *     ([spår 05] Lane UI är overlay, distinkt från triage)
 *
 * Lane UI = pedagogiskt verktyg, alla ser det. Triage = privat
 * (tablet/Magic Mat), syns aldrig på duken. Detta är Lane UI.
 */

export function SimulationDuk({
  exercise,
  laneUiVisible,
  section,
  onEnd,
}: {
  exercise: ExerciseListItem | null;
  laneUiVisible: boolean;
  section: Section;
  onEnd: () => void;
}) {
  const totalSeconds = exercise?.time_seconds ?? 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  // Reset timer when exercise changes.
  useEffect(() => {
    setSecondsLeft(totalSeconds);
  }, [exercise?.id, totalSeconds]);

  // Countdown tick.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  // Auto-end when timer hits zero.
  useEffect(() => {
    if (secondsLeft === 0) onEnd();
  }, [secondsLeft, onEnd]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const elapsedFraction = 1 - secondsLeft / totalSeconds;

  return (
    <div className="flex-1 flex flex-col text-white">
      {/* Top — context */}
      <div className="flex items-baseline justify-between px-12 pt-12">
        <div className="text-[11px] uppercase tracking-[0.4em] text-white/30">
          Exercise running
        </div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-white/30 font-mono truncate max-w-[60%]">
          {exercise?.title ?? "—"}
        </div>
      </div>

      {/* Big timer — center */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          key={exercise?.id ?? "x"}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <div className="text-[13rem] font-extralight leading-none tabular-nums tracking-tight">
            {timeStr}
          </div>
          {/* Subtle progress ring (linear) */}
          <div className="mx-auto mt-8 h-0.5 w-[28rem] bg-white/10 overflow-hidden">
            <div
              className="h-full bg-white/40 transition-all duration-1000 ease-linear"
              style={{ width: `${elapsedFraction * 100}%` }}
            />
          </div>
          <div className="mt-6 text-[10px] uppercase tracking-[0.3em] text-white/30">
            Press OK to end early · ▲ Lane UI · ▼ hide
          </div>
        </motion.div>
      </div>

      {/* Lane UI overlay — träffmönster per bana */}
      <AnimatePresence>
        {laneUiVisible && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="border-t border-white/10 bg-black/80 backdrop-blur-sm px-8 py-6"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                Lane UI · Hit pattern
              </div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/30">
                Triage stays on the tablet
              </div>
            </div>
            <LanesStrip section={section} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface LaneInfo {
  lane_number: number;
  name: string | null;
  status: string;
}

function LanesStrip({ section }: { section: Section }) {
  const { data: lanes } = useQuery({
    queryKey: ["sim-lanes", section],
    queryFn: async () => {
      const { data } = await supabase
        .from("lane_assignments")
        .select("lane_number,name,status")
        .eq("section", section)
        .order("lane_number");
      return (data ?? []) as LaneInfo[];
    },
    staleTime: 30_000,
  });

  if (!lanes || lanes.length === 0) {
    return <div className="text-xs text-white/30">No lanes.</div>;
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${lanes.length}, minmax(0, 1fr))` }}>
      {lanes.map((lane) => (
        <TargetPattern
          key={lane.lane_number}
          lane={lane.lane_number}
          name={lane.name}
          occupied={lane.status === "occupied"}
        />
      ))}
    </div>
  );
}

function TargetPattern({
  lane,
  name,
  occupied,
}: {
  lane: number;
  name: string | null;
  occupied: boolean;
}) {
  // Deterministisk fejk-data per bana — så reload inte ändrar bilden.
  const shots = useMemo(() => generateShots(lane, occupied ? 7 : 0), [lane, occupied]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative aspect-square w-full max-w-[140px] rounded-full border border-white/10 bg-white/[0.02] flex items-center justify-center">
        {/* Rings */}
        <div className="absolute inset-[18%] rounded-full border border-white/8" />
        <div className="absolute inset-[36%] rounded-full border border-white/10" />
        <div className="absolute inset-[54%] rounded-full border border-white/12" />
        <div className="absolute inset-[72%] rounded-full border border-white/20" />
        {/* Shots */}
        {shots.map((s, i) => (
          <span
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              left: `calc(50% + ${s.x}%)`,
              top: `calc(50% + ${s.y}%)`,
              transform: "translate(-50%, -50%)",
              backgroundColor: s.color,
              boxShadow: `0 0 6px 1px ${s.color}80`,
            }}
          />
        ))}
        {/* Lane number — bottom-right corner */}
        <div className="absolute bottom-1 right-2 text-[11px] font-mono text-white/40">
          {lane}
        </div>
      </div>
      <div className="text-[10px] text-white/40 truncate max-w-full">
        {name ?? "—"}
      </div>
    </div>
  );
}

/** Deterministic pseudo-random shot pattern per lane. */
function generateShots(lane: number, count: number) {
  // LCG seeded by lane — stable across re-renders.
  let seed = lane * 9301 + 49297;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const shots: { x: number; y: number; color: string }[] = [];
  for (let i = 0; i < count; i++) {
    // Concentrate slightly around center using sqrt distribution
    const r = Math.sqrt(rand()) * 38; // 0..38% of radius
    const theta = rand() * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    const dist = Math.sqrt(x * x + y * y);
    // Color by distance from center — closer = greener
    let color = "#34d399"; // emerald-400
    if (dist > 22) color = "#fbbf24"; // amber-400
    if (dist > 30) color = "#f87171"; // red-400
    shots.push({ x, y, color });
  }
  return shots;
}
