import { motion, AnimatePresence } from "framer-motion";
import { Play, Crosshair } from "lucide-react";
import type { ExerciseListItem } from "@/services/sessionService";
import { PhaseHints, type RemoteKeyHint } from "@/components/prototyp/PhaseHints";

// Fjärr-hints för select-exercise-fasen.
const SELECT_HINTS: RemoteKeyHint[] = [
  { keys: ["◀", "▶"], label: "browse" },
  { keys: ["OK"], label: "start with this exercise", primary: true },
];

/**
 * Helhetsprototyp — SelectExerciseDuk (iteration 2026-05-26).
 *
 * Chromecast-stil picker mellan prepare och check-in. Per user-feedback:
 * instruktören ser hela passet som en thumbnail-strip på duken och kan
 * välja startpunkt med fjärren. Övningarna körs sen i sekvens från den
 * picked till listans slut (Q1 = A: skip ahead, no wrap).
 *
 * Pickerns highlight-state lever lokalt i DukShell (Q3 = A). Vid OK
 * skrivs current_exercise_index till DB:n och phase byts till check-in.
 *
 * Designspråk: biograf. Stort hero-kort + horisontell strip av thumbnails.
 * "Bilder" är gradient-platshållare (vi har inga foton än); kan ersättas
 * av riktiga bilder via en optional image-prop per övning senare.
 */

export function SelectExerciseDuk({
  exercises,
  selectedIndex,
}: {
  exercises: ExerciseListItem[];
  selectedIndex: number;
}) {
  if (exercises.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-white text-center px-12">
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">
          Today's session
        </div>
        <div className="text-5xl font-light mb-4">No exercises planned</div>
        <div className="text-sm text-white/40 max-w-md">
          Open /tablet/prepare to add exercises before starting.
        </div>
      </div>
    );
  }

  const safeIndex = Math.max(0, Math.min(selectedIndex, exercises.length - 1));
  const current = exercises[safeIndex];

  return (
    <div className="flex-1 flex flex-col text-white relative">
      {/* Top context — date / instructor / session id */}
      <div className="px-12 pt-12">
        <div className="text-[11px] uppercase tracking-[0.4em] text-white/40">
          Today's session · {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Hero — large card for the currently-highlighted exercise */}
      <div className="flex-1 flex items-center justify-center px-12 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-[1280px] aspect-[16/7] rounded-3xl overflow-hidden flex"
            style={{ background: gradientFor(current.weapon) }}
          >
            {/* Left: text */}
            <div className="relative z-10 flex flex-col justify-center p-12 max-w-[55%]">
              <div className="text-[11px] uppercase tracking-[0.3em] text-white/50 mb-4">
                {safeIndex === 0 ? "First up" : `Exercise ${safeIndex + 1} of ${exercises.length}`}
              </div>
              <h1 className="text-5xl font-light leading-[1.05] tracking-tight mb-4">
                {current.title}
              </h1>
              <div className="flex flex-wrap gap-3 text-xs text-white/60 font-mono mb-8">
                {current.weapon && <Chip>{current.weapon}</Chip>}
                {current.hits_threshold !== undefined && <Chip>Hits ≥ {current.hits_threshold}</Chip>}
                {current.time_seconds !== undefined && <Chip>Time ≤ {current.time_seconds}s</Chip>}
                {current.spread_threshold !== undefined && <Chip>Spread ≤ {current.spread_threshold} cm</Chip>}
              </div>
              <SelectCta />
            </div>

            {/* Right: visual placeholder (gradient + symbol) */}
            <div className="absolute right-0 top-0 bottom-0 w-[55%] flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-black/40" />
              <Crosshair className="h-48 w-48 text-white/15" strokeWidth={0.8} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnail strip — fjärr-hinten lever i den globala PhaseHints nedan */}
      <div className="px-12 pb-4">
        <div className="flex items-center gap-4 mb-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
            In order
          </div>
          <div className="flex-1 h-px bg-white/10" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {exercises.map((ex, i) => (
            <Thumbnail
              key={`${ex.id}-${i}`}
              exercise={ex}
              index={i}
              selected={i === safeIndex}
              total={exercises.length}
            />
          ))}
        </div>
      </div>

      <PhaseHints hints={SELECT_HINTS} />
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/20 bg-white/[0.05] px-3 py-1">
      {children}
    </span>
  );
}

function SelectCta() {
  return (
    <div
      aria-hidden
      className="inline-flex items-center gap-3 self-start rounded-full bg-status-warning text-black px-6 py-3 text-base font-medium shadow-lg shadow-status-warning/20"
    >
      <Play className="h-5 w-5 fill-current" />
      <span>Press OK to select</span>
    </div>
  );
}

function Thumbnail({
  exercise,
  index,
  selected,
  total,
}: {
  exercise: ExerciseListItem;
  index: number;
  selected: boolean;
  total: number;
}) {
  // Each thumbnail is approximately equal width — clamp to a reasonable
  // size so 3-10 exercises all look good.
  const widthClass = total <= 3 ? "w-[300px]" : total <= 5 ? "w-[220px]" : "w-[180px]";
  return (
    <motion.div
      layout
      className={`relative ${widthClass} aspect-[16/9] rounded-xl overflow-hidden transition-all duration-300 ${
        selected
          ? "ring-2 ring-white scale-[1.04]"
          : "ring-1 ring-white/10 opacity-50"
      }`}
      style={{ background: gradientFor(exercise.weapon) }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <Crosshair
          className={`h-10 w-10 ${selected ? "text-white/30" : "text-white/15"}`}
          strokeWidth={1}
        />
      </div>
      {/* Index badge */}
      <div className="absolute top-2 left-2 text-[10px] font-mono uppercase tracking-wider text-white/60">
        {String(index + 1).padStart(2, "0")}
      </div>
      {/* Title at bottom, gradient scrim */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3">
        <div className="text-[11px] font-medium text-white truncate">{exercise.title}</div>
      </div>
    </motion.div>
  );
}

// Stable gradient per weapon — visual identitet utan riktiga bilder.
// Samma logik som KriterieDuk så hero och kriterieskärm visuellt stämmer.
function gradientFor(weapon?: string): string {
  if (!weapon) return "linear-gradient(135deg, #1f2937 0%, #0f172a 100%)";
  const seed = [...weapon].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = seed % 360;
  return `linear-gradient(135deg, hsl(${hue} 35% 25%) 0%, hsl(${(hue + 40) % 360} 50% 12%) 100%)`;
}
