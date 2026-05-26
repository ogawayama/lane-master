import { motion } from "framer-motion";
import { Target, Timer, Crosshair, ChevronRight } from "lucide-react";
import type { ExerciseListItem } from "@/services/sessionService";

/**
 * Helhetsprototyp — KriterieDuk (Pass 3).
 *
 * Duken under preflight-fasen. Per
 * [helhetsprototyp/plan.md §5 Pass 3] + [spår 05:s spårkort §Yt-rollerna]
 * + [spår 02 halva B]: kriterieskärmen ÄR Preflight & Play.
 *
 * Tre saker, en vy:
 *   • Briefing  — titel + tränings-typ + foto/symbol-platshållare
 *   • Kriterier — Hits / Time / Spread från [spår 04:s modell]
 *   • Start-CTA — visuell hint om att fjärr-OK startar övningen
 *
 * Read-only på duken (per spår 05:s beslut 2026-05-25:
 * "Add more criteria"-knappen borta). Kriterier sätts i pre-pass
 * ([spår 01](GS-POM/spår/01-relational-system-driven-by-rules)).
 *
 * Designspråk: "biograf" — hero-foton/symboler, stora ytor, lugn.
 * Inget chrome, inget mus-element. Allt drivs av fjärr.
 */

export function KriterieDuk({
  exercise,
  exerciseNumber,
  totalExercises,
  awaitingExercise,
}: {
  exercise: ExerciseListItem | null;
  exerciseNumber: number;
  totalExercises: number;
  awaitingExercise?: boolean;
}) {
  if (awaitingExercise || !exercise) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-12 text-white">
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">
          Preflight
        </div>
        <div className="text-5xl font-light mb-4">No exercise queued</div>
        <div className="text-sm text-white/40 max-w-md">
          Return to pre-pass preparation and add an exercise to the list.
        </div>
      </div>
    );
  }

  // Foto-platshållare baserad på vapen — färgad gradient + symbol.
  // I framtiden ersätts detta med riktiga bilder i public/exercises/.
  const heroGradient = gradientFor(exercise.weapon);

  return (
    <div className="flex-1 flex flex-col text-white">
      {/* Top — kontext-rad */}
      <div className="flex items-baseline justify-between px-12 pt-12">
        <div className="text-[11px] uppercase tracking-[0.4em] text-white/40">
          Preflight · Exercise {exerciseNumber} of {totalExercises}
        </div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-white/30 font-mono">
          {exercise.weapon ?? "—"}
        </div>
      </div>

      {/* Hero — titel + visual placeholder */}
      <div className="flex-1 grid grid-cols-2 gap-12 px-12 py-8">
        <div className="flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="text-[12px] uppercase tracking-[0.35em] text-white/40 mb-4">
              Today's objective
            </div>
            <h1 className="text-6xl font-light leading-[1.05] tracking-tight">
              {exercise.title}
            </h1>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative rounded-3xl overflow-hidden"
          style={{ background: heroGradient }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <Crosshair className="h-32 w-32 text-white/20" strokeWidth={1} />
          </div>
          <div className="absolute bottom-6 left-6 right-6 text-center">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
              Weapon
            </div>
            <div className="text-2xl font-light mt-1">{exercise.weapon ?? "—"}</div>
          </div>
        </motion.div>
      </div>

      {/* Kriterier */}
      <div className="px-12 pb-8">
        <div className="text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4">
          Pass criteria
        </div>
        <div className="grid grid-cols-3 gap-6">
          <CriterionCard
            icon={<Target className="h-5 w-5" />}
            label="Hits"
            value={`≥ ${exercise.hits_threshold ?? "—"}`}
          />
          <CriterionCard
            icon={<Timer className="h-5 w-5" />}
            label="Time"
            value={
              exercise.time_seconds !== undefined
                ? `≤ ${exercise.time_seconds}s`
                : "—"
            }
          />
          <CriterionCard
            icon={<Crosshair className="h-5 w-5" />}
            label="Spread"
            value={`≤ ${exercise.spread_threshold ?? "—"} cm`}
          />
        </div>
      </div>

      {/* Start-CTA — fjärr-hint */}
      <div className="px-12 pb-12 flex items-center justify-center gap-3 text-white/60">
        <span className="text-sm uppercase tracking-[0.3em]">Press</span>
        <span className="inline-flex items-center justify-center h-9 w-12 rounded border border-white/40 text-sm font-mono">
          OK
        </span>
        <span className="text-sm uppercase tracking-[0.3em]">to start</span>
        <ChevronRight className="h-4 w-4 opacity-50 ml-2" />
      </div>
    </div>
  );
}

function CriterionCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 text-white/50 mb-2">
        {icon}
        <span className="text-[11px] uppercase tracking-[0.3em]">{label}</span>
      </div>
      <div className="text-3xl font-light tabular-nums">{value}</div>
    </div>
  );
}

// Stable gradient per weapon — visual identitet utan riktiga bilder.
function gradientFor(weapon?: string): string {
  if (!weapon) return "linear-gradient(135deg, #1f2937 0%, #0f172a 100%)";
  const seed = [...weapon].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = seed % 360;
  return `linear-gradient(135deg, hsl(${hue} 35% 25%) 0%, hsl(${(hue + 40) % 360} 50% 12%) 100%)`;
}
