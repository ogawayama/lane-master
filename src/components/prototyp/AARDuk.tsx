import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Target, Timer, Crosshair, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  computeResult,
  sortByPriority,
  severityOf,
  type AARResult,
  type Status,
} from "@/services/aarResults";
import type { Shot } from "@/services/shotSimulation";
import { pickCue } from "@/data/cueLibrary";
import type { ExerciseListItem, Section } from "@/services/sessionService";
import { PhaseHints, type RemoteKeyHint } from "@/components/prototyp/PhaseHints";

/**
 * Helhetsprototyp — AARDuk (Pass 6, omdesignad 2026-05-28).
 *
 * Två lägen, styrda från DukShell via fjärr:
 *
 *   1. OVERVIEW  — split-view, alla banor sida vid sida. Varje bana
 *      visar sitt papptavle-mönster (samma som under DAR), tre metric-
 *      chips, samt 1-rads pick-up-line för röda kriterier. En bana är
 *      markerad som "focus" — ◀ ▶ flyttar markeringen.
 *
 *   2. ZOOM      — hero-vy för en enskild skytt. Stor target med hit-
 *      pattern, full pick-up-line per rött kriterium, identity vänster.
 *      Triggas med OK från overview. Back/OK tar tillbaka till overview.
 *
 * Per [beslut 2026-05-28]: ersätter karusell-modellen (2026-05-25). Den
 * kollektiva vyn matchar speglingsprincipen (alla ser samma vy
 * samtidigt) och ger visuell kontinuitet med DAR-papptavlorna. Zoom-
 * läget bevarar möjligheten till individuell drill-down — instruktören
 * väljer själv när hen vill gå djupt.
 *
 * Skott-mönstret kommer från samma deterministiska sequence som
 * SimulationDuk visade live. Hits/spread härleds från samma data.
 */

interface LaneInfo {
  lane_number: number;
  name: string | null;
  weapon_name: string | null;
  status: string;
}

// Semantiska tokens — definierade i index.css. Tonas via /N (t.ex. /10).
// red→attention, yellow→warning, green→success (per spår 03/04 triage).
const STATUS_TINT: Record<Status, string> = {
  red: "bg-status-attention/12 border-status-attention/45 text-status-attention",
  yellow: "bg-status-warning/10 border-status-warning/40 text-status-warning",
  green: "bg-status-success/8 border-status-success/25 text-status-success",
};

const STATUS_DOT: Record<Status, string> = {
  red: "bg-status-attention",
  yellow: "bg-status-warning",
  green: "bg-status-success",
};

// SVG-stroke kan inte ärva från Tailwind klasser → läs CSS-variabeln
// direkt med hsl(var(--...)). Hålls i sync med tokens.
const STATUS_STROKE: Record<Status, string> = {
  red: "hsl(var(--status-attention))",
  yellow: "hsl(var(--status-warning))",
  green: "hsl(var(--status-success))",
};

// Fjärr-hints för AAR-fasen — drivs av PhaseHints.
const OVERVIEW_HINTS: RemoteKeyHint[] = [
  { keys: ["◀", "▶"], label: "select trainee" },
  { keys: ["OK"], label: "zoom in", primary: true },
  { keys: ["HOLD OK"], label: "next exercise" },
];
const ZOOM_HINTS: RemoteKeyHint[] = [
  { keys: ["◀", "▶"], label: "other trainee" },
  { keys: ["BACK"], label: "back to overview" },
  { keys: ["HOLD OK"], label: "next exercise" },
];

export function AARDuk({
  exercise,
  section,
  focusIndex,
  zoomed,
}: {
  exercise: ExerciseListItem | null;
  section: Section;
  /** Index i prioriterad resultatlista — clampas cykliskt i komponenten. */
  focusIndex: number;
  /** Zoom-läge — drivs från DukShell via fjärr-OK. */
  zoomed: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
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

  const safeFocus = results.length > 0
    ? ((focusIndex % results.length) + results.length) % results.length
    : 0;

  if (!exercise) {
    return (
      <EmptyState
        title="No exercise to review"
        sub="Return to preflight or load an exercise."
      />
    );
  }

  if (results.length === 0) {
    return (
      <EmptyState
        title="No trainees on the lanes"
        sub="Press OK on the remote to continue."
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col text-white">
      {/* Header */}
      <div className="grid grid-cols-3 items-baseline px-12 pt-10 pb-4">
        <div className="text-[11px] uppercase tracking-[0.4em] text-white/45">
          After Action Review
        </div>
        <div className="text-center text-[11px] uppercase tracking-[0.3em] text-white/40 font-mono truncate">
          {exercise.title}
        </div>
        <div className="text-right text-[11px] uppercase tracking-[0.3em] text-white/40 font-mono tabular-nums">
          {results.length} trainees · {results.filter((r) => r.reds.length > 0).length} priority
        </div>
      </div>

      {/* Main */}
      <AnimatePresence mode="wait">
        {zoomed ? (
          <motion.div
            key="zoom"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: "easeOut" }}
            className="flex-1 flex flex-col"
          >
            <ZoomView result={results[safeFocus]} exercise={exercise} />
          </motion.div>
        ) : (
          <motion.div
            key="overview"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
            className="flex-1 flex flex-col"
          >
            <OverviewGrid
              results={results}
              exercise={exercise}
              focusIndex={safeFocus}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom — remote hints */}
      <PhaseHints hints={zoomed ? ZOOM_HINTS : OVERVIEW_HINTS} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* Overview — alla skyttar sida vid sida                                */
/* ──────────────────────────────────────────────────────────────────── */

function OverviewGrid({
  results,
  exercise,
  focusIndex,
}: {
  results: AARResult[];
  exercise: ExerciseListItem;
  focusIndex: number;
}) {
  return (
    <div
      className="flex-1 px-8 pb-2 grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${results.length}, minmax(0, 1fr))`,
      }}
    >
      {results.map((r, i) => (
        <LaneCard
          key={r.lane}
          result={r}
          exercise={exercise}
          focused={i === focusIndex}
        />
      ))}
    </div>
  );
}

function LaneCard({
  result,
  exercise,
  focused,
}: {
  result: AARResult;
  exercise: ExerciseListItem;
  focused: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  // Värsta status över alla tre kriterier — bestämmer kortets accent.
  const worst: Status =
    result.reds.length > 0 ? "red" : result.yellows.length > 0 ? "yellow" : "green";

  // En cue per kort — det högst prioriterade röda kriteriet, om något.
  const headlineCue = useMemo(() => {
    const priorityOrder = ["hit", "time", "spread"] as const;
    for (const crit of priorityOrder) {
      if (result.reds.includes(crit)) {
        return { crit, cue: pickCue(result.lane, exercise.id, crit, "red") };
      }
    }
    return null;
  }, [result, exercise.id]);

  return (
    <motion.div
      layout
      animate={{
        scale: focused && !prefersReducedMotion ? 1.04 : 1,
      }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeOut" }}
      className={`relative rounded-2xl border bg-white/[0.02] p-4 flex flex-col gap-3 transition-colors ${
        focused
          ? "border-status-warning/80 shadow-[0_0_0_2px_hsl(var(--status-warning)/0.35)]"
          : "border-white/8"
      }`}
    >
      {/* Identity */}
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
            Lane {result.lane}
          </div>
          <div className="text-xl font-light leading-tight truncate max-w-[180px]">
            {result.trainee ?? "—"}
          </div>
        </div>
        <StatusBadge status={worst} />
      </div>

      {/* Target */}
      <TargetSvg
        shots={result.sequence.shots}
        worst={worst}
        size="md"
      />

      {/* Metric chips */}
      <div className="grid grid-cols-3 gap-1.5">
        <MetricChip
          label="Hit"
          value={`${result.hits}`}
          status={result.hit_status}
        />
        <MetricChip
          label="Time"
          value={`${result.time_seconds}s`}
          status={result.time_status}
        />
        <MetricChip
          label="Spread"
          value={`${result.spread_cm}cm`}
          status={result.spread_status}
        />
      </div>

      {/* Pick-up-line — en rad, för det värsta röda */}
      <div className="min-h-[44px] text-[11px] leading-snug">
        {headlineCue ? (
          <div className="text-status-attention/90">"{headlineCue.cue}"</div>
        ) : worst === "yellow" ? (
          <div className="text-status-warning/80">Borderline — worth a follow-up.</div>
        ) : (
          <div className="text-status-success/70">✓ On track across all criteria.</div>
        )}
      </div>
    </motion.div>
  );
}

function MetricChip({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: Status;
}) {
  const tint = STATUS_TINT[status];
  return (
    <div className={`rounded-lg border px-2 py-1.5 ${tint}`}>
      <div className="text-[9px] uppercase tracking-[0.25em] opacity-70">{label}</div>
      <div className="text-base font-light tabular-nums leading-tight">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const label =
    status === "red" ? "Attention" : status === "yellow" ? "Review" : "Good";
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
      <span className="text-[9px] uppercase tracking-[0.3em] text-white/60">
        {label}
      </span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* Zoom — hero-vy för en skytt                                          */
/* ──────────────────────────────────────────────────────────────────── */

function ZoomView({
  result,
  exercise,
}: {
  result: AARResult;
  exercise: ExerciseListItem;
}) {
  const worst: Status =
    result.reds.length > 0 ? "red" : result.yellows.length > 0 ? "yellow" : "green";

  return (
    <div className="flex-1 grid grid-cols-[380px_1fr_460px] gap-10 px-12 py-6">
      {/* Identity */}
      <div className="flex flex-col justify-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
          Lane {result.lane}
        </div>
        <div className="text-6xl font-light leading-none tracking-tight">
          {result.trainee ?? "—"}
        </div>
        <div className="mt-4 text-base text-white/50">{result.weapon ?? "—"}</div>
        <div className="mt-8">
          <StatusBadge status={worst} />
          {result.reds.length > 0 && (
            <div className="mt-2 text-[11px] uppercase tracking-[0.3em] text-status-attention/90">
              {result.reds.length} priorit{result.reds.length > 1 ? "ies" : "y"} to work on
            </div>
          )}
        </div>
      </div>

      {/* Stor target med hit-pattern + annoteringar för red criteria */}
      <div className="flex items-center justify-center">
        <div className="w-full max-w-[460px] aspect-square">
          <TargetSvg
            shots={result.sequence.shots}
            worst={worst}
            size="lg"
            annotations={computeAnnotations(result)}
          />
        </div>
      </div>

      {/* Criterion cards med full pick-up-line */}
      <div className="flex flex-col justify-center gap-3">
        <CriterionCard
          icon={<Target className="h-5 w-5" />}
          label="Hits"
          value={`${result.hits}`}
          threshold={`≥ ${exercise.hits_threshold ?? "—"}`}
          status={result.hit_status}
          cue={
            severityOf(result.hit_status)
              ? pickCue(result.lane, exercise.id, "hit", severityOf(result.hit_status)!)
              : null
          }
          expanded={result.hit_status !== "green"}
        />
        <CriterionCard
          icon={<Timer className="h-5 w-5" />}
          label="Time"
          value={`${result.time_seconds}s`}
          threshold={`≤ ${exercise.time_seconds}s`}
          status={result.time_status}
          cue={
            severityOf(result.time_status)
              ? pickCue(result.lane, exercise.id, "time", severityOf(result.time_status)!)
              : null
          }
          expanded={result.time_status !== "green"}
        />
        <CriterionCard
          icon={<Crosshair className="h-5 w-5" />}
          label="Spread"
          value={`${result.spread_cm} cm`}
          threshold={`≤ ${exercise.spread_threshold} cm`}
          status={result.spread_status}
          cue={
            severityOf(result.spread_status)
              ? pickCue(result.lane, exercise.id, "spread", severityOf(result.spread_status)!)
              : null
          }
          expanded={result.spread_status !== "green"}
        />
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
    <div className={`rounded-2xl border ${tint} px-5 py-4`}>
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
            transition={{ duration: 0.22 }}
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

/* ──────────────────────────────────────────────────────────────────── */
/* Target SVG — renderar skotten från shot-sequence                     */
/* ──────────────────────────────────────────────────────────────────── */

/**
 * Pilar & spread-ringar för zoom-läget — porterat från [spår 04 sim.html]
 * (UX-review 2026-05-28). Två typer:
 *
 *  - arrow      För HIT-red: pilar från centrum mot missarnas tyngdpunkt
 *               med riktningsetikett ("pulls left", "drops low", etc.)
 *  - spread-rings For SPREAD-red: limit-ring (grön streckad) vs actual-ring
 *               (red streckad) — visar hur långt utanför tröskeln spridningen är
 *
 * Renderas ENDAST i zoom (overview-korten ska vara rena så ögat snabbt
 * kan svepa över alla skyttar utan visuellt brus).
 */
type Annotation =
  | { type: "arrow"; x1: number; y1: number; x2: number; y2: number; label: string }
  | { type: "spread-rings"; r_limit: number; r_actual: number };

function computeAnnotations(result: AARResult): Annotation[] {
  const ann: Annotation[] = [];

  // SPREAD red → ringar. Limit-ringen ligger alltid vid r=25% (det är
  // hur skalningen i computeResult är definierad: spread_pct=25 motsvarar
  // exakt threshold-cm). Actual = sequence.spread_pct, klamp så ringen
  // syns även om den krympt liten.
  if (result.spread_status === "red") {
    ann.push({
      type: "spread-rings",
      r_limit: 25,
      r_actual: Math.min(45, Math.max(8, result.sequence.spread_pct)),
    });
  }

  // HIT red → pil mot missarnas tyngdpunkt (om det finns minst två
  // missar att räkna på, annars är riktningen brus).
  if (result.hit_status === "red") {
    const misses = result.sequence.shots.filter((s) => !s.hit);
    if (misses.length >= 2) {
      const cx = misses.reduce((a, s) => a + s.x, 0) / misses.length;
      const cy = misses.reduce((a, s) => a + s.y, 0) / misses.length;
      const mag = Math.sqrt(cx * cx + cy * cy);
      // Bara om missarna verkligen klustrar (mag > 8% från centrum).
      // Slumpmässigt spridda missar ska inte få en falsk pil.
      if (mag > 8) {
        let label = "";
        if (Math.abs(cx) > Math.abs(cy)) {
          label = cx > 0 ? "pulls right" : "pulls left";
        } else {
          label = cy > 0 ? "drops low" : "shoots high";
        }
        ann.push({
          type: "arrow",
          x1: 0,
          y1: 0,
          x2: Math.round(cx),
          y2: Math.round(cy),
          label,
        });
      }
    }
  }

  return ann;
}

function TargetSvg({
  shots,
  worst,
  size,
  annotations = [],
}: {
  shots: Shot[];
  worst: Status;
  size: "md" | "lg";
  annotations?: Annotation[];
}) {
  const hitRadius = size === "lg" ? 2.4 : 2.2;
  const missRadius = size === "lg" ? 1.6 : 1.5;
  const accent = STATUS_STROKE[worst];

  return (
    <svg
      viewBox="-50 -50 100 100"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Papptavla — samma estetik som SimulationDuk för kontinuitet */}
      <circle cx="0" cy="0" r="48" fill="#1c1c26" stroke="#33334a" strokeWidth="0.4" />
      <circle cx="0" cy="0" r="36" fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.4" />
      <circle cx="0" cy="0" r="25" fill="none" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="0.4" />
      <circle cx="0" cy="0" r="14" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="0.4" />
      <circle cx="0" cy="0" r="2.5" fill="#ffffff" fillOpacity="0.18" />
      <line x1="-4" y1="0" x2="4" y2="0" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="0.3" />
      <line x1="0" y1="-4" x2="0" y2="4" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="0.3" />

      {/* Subtilt status-glow runt kanten (bara i AAR — ger en tonkänsla
          utan att skotten själva blir färgade) */}
      <circle
        cx="0"
        cy="0"
        r="48"
        fill="none"
        stroke={accent}
        strokeOpacity={worst === "green" ? 0.15 : worst === "yellow" ? 0.35 : 0.5}
        strokeWidth="0.6"
      />

      {/* Annotations (bara i zoom) — ritas BAKOM skotten så skotten syns över */}
      {annotations.map((a, i) => {
        if (a.type === "spread-rings") {
          return (
            <g key={`ann-${i}`}>
              <circle
                cx="0"
                cy="0"
                r={a.r_limit}
                fill="none"
                stroke="hsl(var(--status-success))"
                strokeOpacity="0.7"
                strokeWidth="0.5"
                strokeDasharray="2,1.5"
              />
              <circle
                cx="0"
                cy="0"
                r={a.r_actual}
                fill="none"
                stroke="hsl(var(--status-attention))"
                strokeOpacity="0.8"
                strokeWidth="0.6"
                strokeDasharray="2,1.5"
              />
              <text
                x={a.r_limit + 2}
                y="-1.5"
                fill="hsl(var(--status-success))"
                fontSize="3.2"
                opacity="0.85"
                fontFamily="ui-monospace, monospace"
              >
                limit
              </text>
              <text
                x={a.r_actual + 2}
                y="4"
                fill="hsl(var(--status-attention))"
                fontSize="3.2"
                opacity="0.85"
                fontFamily="ui-monospace, monospace"
              >
                actual
              </text>
            </g>
          );
        }
        // arrow
        return (
          <g key={`ann-${i}`}>
            <defs>
              <marker
                id={`arrowhead-${i}`}
                markerWidth="5"
                markerHeight="5"
                refX="2.5"
                refY="2.5"
                orient="auto"
              >
                <path d="M0,0 L5,2.5 L0,5 Z" fill={accent} opacity="0.7" />
              </marker>
            </defs>
            <line
              x1={a.x1}
              y1={a.y1}
              x2={a.x2}
              y2={a.y2}
              stroke={accent}
              strokeWidth="0.8"
              strokeDasharray="2,1.2"
              opacity="0.55"
              markerEnd={`url(#arrowhead-${i})`}
            />
            <text
              x={a.x2}
              y={a.y2 - 3}
              fill={accent}
              fontSize="3.2"
              opacity="0.9"
              fontFamily="ui-monospace, monospace"
              textAnchor="middle"
            >
              {a.label}
            </text>
          </g>
        );
      })}

      {/* Skott */}
      {shots.map((shot) => (
        <g key={shot.i}>
          {shot.hit ? (
            <>
              <circle cx={shot.x} cy={shot.y} r={hitRadius} fill="#ffffff" opacity="0.92" />
              <circle cx={shot.x} cy={shot.y} r={hitRadius + 1} fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="0.4" />
            </>
          ) : (
            <circle
              cx={shot.x}
              cy={shot.y}
              r={missRadius}
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.45"
              strokeWidth="0.5"
            />
          )}
        </g>
      ))}
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* Småkomponenter                                                       */
/* ──────────────────────────────────────────────────────────────────── */

function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-white text-center px-12">
      <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">
        After Action Review
      </div>
      <div className="text-5xl font-light">{title}</div>
      <div className="mt-4 text-sm text-white/40">{sub}</div>
    </div>
  );
}
