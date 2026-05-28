import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Box, Card, Chip, Stack, Typography } from "@mui/material";
import {
  GpsFixed as TargetIcon,
  AccessTime as TimerIcon,
  CenterFocusStrong as SpreadIcon,
} from "@mui/icons-material";
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
import { dukTypography, focusRing } from "@/theme/tv";

/**
 * Helhetsprototyp — AARDuk (M3-omskrivning 2026-05-28).
 *
 * Två lägen styrda av DukShell via fjärr:
 *   1. OVERVIEW — alla skyttar sida vid sida som M3 Cards. ◀ ▶ flyttar
 *      M3 focus-ring runt vald bana. Pick-up-line per kort (kort version).
 *   2. ZOOM — hero-vy för en skytt. Stor target med annoteringar
 *      (pilar, spread-ringar), full pick-up-line per criterion.
 *
 * M3-stil:
 *   - Lane-cards: surfaceContainerLow + outline focus
 *   - Status-färger via tokens (status-attention/-warning/-success)
 *   - Criterion-cards: surfaceContainer med tonal tint per status
 *   - SVG-targets: behåller egen rendering men strokes via CSS vars
 *   - Type scale: dukTypography för 10-foot UI
 */

interface LaneInfo {
  lane_number: number;
  name: string | null;
  weapon_name: string | null;
  status: string;
}

// Status-tokens via M3 + våra extensions
const STATUS_BG: Record<Status, string> = {
  red: "var(--mui-palette-m3-statusAttentionContainer)",
  yellow: "var(--mui-palette-m3-statusWarningContainer)",
  green: "var(--mui-palette-m3-statusSuccessContainer)",
};
const STATUS_FG: Record<Status, string> = {
  red: "var(--mui-palette-error-main)",
  yellow: "var(--mui-palette-warning-main)",
  green: "var(--mui-palette-success-main)",
};
const STATUS_DOT: Record<Status, string> = {
  red: "var(--mui-palette-error-main)",
  yellow: "var(--mui-palette-warning-main)",
  green: "var(--mui-palette-success-main)",
};
const STATUS_STROKE: Record<Status, string> = {
  red: "var(--mui-palette-error-main)",
  yellow: "var(--mui-palette-warning-main)",
  green: "var(--mui-palette-success-main)",
};

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
  focusIndex: number;
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
      lanes.map((l) => computeResult(l.lane_number, l.name, l.weapon_name, exercise)),
    );
  }, [lanes, exercise]);

  const safeFocus = results.length > 0
    ? ((focusIndex % results.length) + results.length) % results.length
    : 0;

  if (!exercise) {
    return <EmptyState title="No exercise to review" sub="Return to preflight or load an exercise." />;
  }
  if (results.length === 0) {
    return <EmptyState title="No trainees on the lanes" sub="Press OK on the remote to continue." />;
  }

  return (
    <Stack sx={{ flex: 1, color: "text.primary" }}>
      {/* Header */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          alignItems: "baseline",
          px: 6,
          pt: 5,
          pb: 2,
        }}
      >
        <Typography sx={{ ...dukTypography.labelLarge, color: "text.secondary" }}>
          After Action Review
        </Typography>
        <Typography
          sx={{
            ...dukTypography.labelMedium,
            color: "text.secondary",
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {exercise.title}
        </Typography>
        <Typography
          sx={{
            ...dukTypography.labelMedium,
            color: "text.secondary",
            textAlign: "right",
            fontFamily: '"Roboto Mono", monospace',
          }}
        >
          {results.length} trainees · {results.filter((r) => r.reds.length > 0).length} priority
        </Typography>
      </Box>

      {/* Main */}
      <AnimatePresence mode="wait">
        {zoomed ? (
          <motion.div
            key="zoom"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: "easeOut" }}
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
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
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
          >
            <OverviewGrid results={results} exercise={exercise} focusIndex={safeFocus} />
          </motion.div>
        )}
      </AnimatePresence>

      <PhaseHints hints={zoomed ? ZOOM_HINTS : OVERVIEW_HINTS} />
    </Stack>
  );
}

/* ─── Overview ─────────────────────────────────────────────────────── */

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
    <Box
      sx={{
        flex: 1,
        px: 4,
        pb: 1,
        display: "grid",
        gap: 2,
        gridTemplateColumns: `repeat(${results.length}, minmax(0, 1fr))`,
      }}
    >
      {results.map((r, i) => (
        <LaneCard key={r.lane} result={r} exercise={exercise} focused={i === focusIndex} />
      ))}
    </Box>
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
  const worst: Status =
    result.reds.length > 0 ? "red" : result.yellows.length > 0 ? "yellow" : "green";

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
    <Card
      component={motion.div}
      layout
      animate={{ scale: focused && !prefersReducedMotion ? 1.04 : 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeOut" }}
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        bgcolor: "var(--mui-palette-m3-surfaceContainerLow)",
        outline: focused ? "3px solid" : "none",
        outlineColor: "warning.main",
        outlineOffset: "2px",
        transition: "outline-color 200ms",
      }}
    >
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <Box>
          <Typography sx={{ ...dukTypography.labelMedium, color: "text.secondary" }}>
            Lane {result.lane}
          </Typography>
          <Typography
            sx={{
              ...dukTypography.titleMedium,
              color: "text.primary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 180,
            }}
          >
            {result.trainee ?? "—"}
          </Typography>
        </Box>
        <StatusBadge status={worst} />
      </Stack>

      <TargetSvg shots={result.sequence.shots} worst={worst} size="md" />

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.75 }}>
        <MetricChip label="Hit" value={`${result.hits}`} status={result.hit_status} />
        <MetricChip label="Time" value={`${result.time_seconds}s`} status={result.time_status} />
        <MetricChip label="Spread" value={`${result.spread_cm}cm`} status={result.spread_status} />
      </Box>

      <Box sx={{ minHeight: 44 }}>
        {headlineCue ? (
          <Typography sx={{ fontSize: 12, lineHeight: 1.4, color: "error.main" }}>
            "{headlineCue.cue}"
          </Typography>
        ) : worst === "yellow" ? (
          <Typography sx={{ fontSize: 12, lineHeight: 1.4, color: "warning.main", opacity: 0.85 }}>
            Borderline — worth a follow-up.
          </Typography>
        ) : (
          <Typography sx={{ fontSize: 12, lineHeight: 1.4, color: "success.main", opacity: 0.85 }}>
            ✓ On track across all criteria.
          </Typography>
        )}
      </Box>
    </Card>
  );
}

function MetricChip({ label, value, status }: { label: string; value: string; status: Status }) {
  return (
    <Box
      sx={{
        borderRadius: 1.5,
        border: 1,
        borderColor: STATUS_FG[status],
        bgcolor: STATUS_BG[status],
        color: STATUS_FG[status],
        px: 1,
        py: 0.75,
      }}
    >
      <Typography sx={{ fontSize: 9, letterSpacing: "0.25em", opacity: 0.7, textTransform: "uppercase" }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 16, fontWeight: 400, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
        {value}
      </Typography>
    </Box>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const label = status === "red" ? "Attention" : status === "yellow" ? "Review" : "Good";
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: STATUS_DOT[status] }} />
      <Typography sx={{ fontSize: 9, letterSpacing: "0.3em", color: "text.secondary", textTransform: "uppercase" }}>
        {label}
      </Typography>
    </Stack>
  );
}

/* ─── Zoom ─────────────────────────────────────────────────────────── */

function ZoomView({ result, exercise }: { result: AARResult; exercise: ExerciseListItem }) {
  const worst: Status =
    result.reds.length > 0 ? "red" : result.yellows.length > 0 ? "yellow" : "green";

  return (
    <Box
      sx={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "380px 1fr 460px",
        gap: 5,
        px: 6,
        py: 3,
      }}
    >
      {/* Identity */}
      <Stack sx={{ justifyContent: "center" }} spacing={2}>
        <Typography sx={{ ...dukTypography.labelMedium, color: "text.secondary" }}>
          Lane {result.lane}
        </Typography>
        <Typography sx={{ ...dukTypography.displayMedium, color: "text.primary" }}>
          {result.trainee ?? "—"}
        </Typography>
        <Typography sx={{ ...dukTypography.bodyLarge, color: "text.secondary" }}>
          {result.weapon ?? "—"}
        </Typography>
        <Box sx={{ mt: 4 }}>
          <StatusBadge status={worst} />
          {result.reds.length > 0 && (
            <Typography sx={{ ...dukTypography.labelMedium, color: "error.main", mt: 1 }}>
              {result.reds.length} priorit{result.reds.length > 1 ? "ies" : "y"} to work on
            </Typography>
          )}
        </Box>
      </Stack>

      {/* Target with annotations */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box sx={{ width: "100%", maxWidth: 460, aspectRatio: "1 / 1" }}>
          <TargetSvg
            shots={result.sequence.shots}
            worst={worst}
            size="lg"
            annotations={computeAnnotations(result)}
          />
        </Box>
      </Box>

      {/* Criterion cards */}
      <Stack sx={{ justifyContent: "center" }} spacing={1.5}>
        <CriterionCard
          icon={<TargetIcon sx={{ fontSize: 22 }} />}
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
          icon={<TimerIcon sx={{ fontSize: 22 }} />}
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
          icon={<SpreadIcon sx={{ fontSize: 22 }} />}
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
      </Stack>
    </Box>
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
  return (
    <Card
      sx={{
        bgcolor: STATUS_BG[status],
        borderRadius: "20px",
        border: 1,
        borderColor: STATUS_FG[status],
        px: 2.5,
        py: 2,
        color: STATUS_FG[status],
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: STATUS_DOT[status] }} />
          {icon}
          <Typography sx={{ fontSize: 11, letterSpacing: "0.3em", opacity: 0.85, textTransform: "uppercase" }}>
            {label}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "baseline" }}>
          <Typography sx={{ ...dukTypography.headlineSmall, fontVariantNumeric: "tabular-nums" }}>
            {value}
          </Typography>
          <Typography sx={{ fontSize: 12, opacity: 0.6, fontFamily: '"Roboto Mono", monospace' }}>
            {threshold}
          </Typography>
        </Stack>
      </Stack>
      <AnimatePresence>
        {expanded && cue && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <Box sx={{ pt: 1.5, mt: 1.5, borderTop: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <Typography sx={{ fontSize: 10, letterSpacing: "0.3em", opacity: 0.6, mb: 0.5, textTransform: "uppercase" }}>
                Pick-up line
              </Typography>
              <Typography sx={{ fontSize: 16, lineHeight: 1.4 }}>"{cue}"</Typography>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/* ─── Annotations ──────────────────────────────────────────────────── */

type Annotation =
  | { type: "arrow"; x1: number; y1: number; x2: number; y2: number; label: string }
  | { type: "spread-rings"; r_limit: number; r_actual: number };

function computeAnnotations(result: AARResult): Annotation[] {
  const ann: Annotation[] = [];
  if (result.spread_status === "red") {
    ann.push({
      type: "spread-rings",
      r_limit: 25,
      r_actual: Math.min(45, Math.max(8, result.sequence.spread_pct)),
    });
  }
  if (result.hit_status === "red") {
    const misses = result.sequence.shots.filter((s) => !s.hit);
    if (misses.length >= 2) {
      const cx = misses.reduce((a, s) => a + s.x, 0) / misses.length;
      const cy = misses.reduce((a, s) => a + s.y, 0) / misses.length;
      const mag = Math.sqrt(cx * cx + cy * cy);
      if (mag > 8) {
        let label = "";
        if (Math.abs(cx) > Math.abs(cy)) {
          label = cx > 0 ? "pulls right" : "pulls left";
        } else {
          label = cy > 0 ? "drops low" : "shoots high";
        }
        ann.push({ type: "arrow", x1: 0, y1: 0, x2: Math.round(cx), y2: Math.round(cy), label });
      }
    }
  }
  return ann;
}

/* ─── Target SVG ───────────────────────────────────────────────────── */

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
    <Box sx={{ width: "100%", aspectRatio: "1 / 1" }}>
      <svg
        viewBox="-50 -50 100 100"
        style={{ width: "100%", height: "100%" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="0" cy="0" r="48" fill="var(--mui-palette-m3-surfaceContainer)" stroke="var(--mui-palette-m3-outlineVariant)" strokeWidth="0.4" />
        <circle cx="0" cy="0" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />
        <circle cx="0" cy="0" r="25" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.4" />
        <circle cx="0" cy="0" r="14" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.4" />
        <circle cx="0" cy="0" r="2.5" fill="rgba(255,255,255,0.18)" />
        <line x1="-4" y1="0" x2="4" y2="0" stroke="rgba(255,255,255,0.10)" strokeWidth="0.3" />
        <line x1="0" y1="-4" x2="0" y2="4" stroke="rgba(255,255,255,0.10)" strokeWidth="0.3" />

        <circle
          cx="0"
          cy="0"
          r="48"
          fill="none"
          stroke={accent}
          strokeOpacity={worst === "green" ? 0.15 : worst === "yellow" ? 0.35 : 0.5}
          strokeWidth="0.6"
        />

        {annotations.map((a, i) => {
          if (a.type === "spread-rings") {
            return (
              <g key={`ann-${i}`}>
                <circle cx="0" cy="0" r={a.r_limit} fill="none" stroke="var(--mui-palette-success-main)" strokeOpacity="0.7" strokeWidth="0.5" strokeDasharray="2,1.5" />
                <circle cx="0" cy="0" r={a.r_actual} fill="none" stroke="var(--mui-palette-error-main)" strokeOpacity="0.8" strokeWidth="0.6" strokeDasharray="2,1.5" />
                <text x={a.r_limit + 2} y="-1.5" fill="var(--mui-palette-success-main)" fontSize="3.2" opacity="0.85" fontFamily="ui-monospace, monospace">
                  limit
                </text>
                <text x={a.r_actual + 2} y="4" fill="var(--mui-palette-error-main)" fontSize="3.2" opacity="0.85" fontFamily="ui-monospace, monospace">
                  actual
                </text>
              </g>
            );
          }
          return (
            <g key={`ann-${i}`}>
              <defs>
                <marker id={`arrowhead-${i}`} markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
                  <path d="M0,0 L5,2.5 L0,5 Z" fill={accent} opacity="0.7" />
                </marker>
              </defs>
              <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke={accent} strokeWidth="0.8" strokeDasharray="2,1.2" opacity="0.55" markerEnd={`url(#arrowhead-${i})`} />
              <text x={a.x2} y={a.y2 - 3} fill={accent} fontSize="3.2" opacity="0.9" fontFamily="ui-monospace, monospace" textAnchor="middle">
                {a.label}
              </text>
            </g>
          );
        })}

        {shots.map((shot) => (
          <g key={shot.i}>
            {shot.hit ? (
              <>
                <circle cx={shot.x} cy={shot.y} r={hitRadius} fill="#ffffff" opacity="0.92" />
                <circle cx={shot.x} cy={shot.y} r={hitRadius + 1} fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="0.4" />
              </>
            ) : (
              <circle cx={shot.x} cy={shot.y} r={missRadius} fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="0.5" />
            )}
          </g>
        ))}
      </svg>
    </Box>
  );
}

function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <Stack sx={{ flex: 1, alignItems: "center", justifyContent: "center", textAlign: "center" }} spacing={2}>
      <Typography sx={{ ...dukTypography.labelLarge, color: "text.secondary" }}>
        After Action Review
      </Typography>
      <Typography sx={{ ...dukTypography.displayMedium, color: "text.primary" }}>{title}</Typography>
      <Typography sx={{ ...dukTypography.bodyLarge, color: "text.secondary" }}>{sub}</Typography>
    </Stack>
  );
}
