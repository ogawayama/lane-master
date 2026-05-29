import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Box, Card, Chip, Stack, Typography } from "@mui/material";
import { GpsFixed, AccessTime, CenterFocusStrong } from "@mui/icons-material";
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
import { dukTypography } from "@/theme/tv";
import {
  m3Duration,
  m3Easing,
  statusTintedSurface,
  tvFocus,
} from "@/theme/m3State";

/**
 * Helhetsprototyp — AARDuk (M3 Immersive List redesign 2026-05-28).
 *
 * RIKTIG M3-applikation, inte tokens-på-existing-layout:
 *
 *  - Layout-template: IMMERSIVE LIST (Android TV M3-pattern).
 *    Fokuserad skytt = hero, andra = quiet bottom-strip.
 *  - INGEN zoom-toggle. Selected ÄR immersive. En modal, en grammatik.
 *  - Hero-bakgrund = tonal surface tintad med fokuserad skytts status-
 *    färg (vår "content-derived color" — utan bilder).
 *  - Target som hero-element, INTE en av tre rutor på samma yta.
 *  - Pick-up-line som Headline (M3 type role = primary message).
 *  - Bottom-strip cards med RIKTIG M3 focus-indikator (scale + glow +
 *    outline + color), inte bara outline.
 *  - State layers (opacity overlays) för hovered/focused, inte
 *    utility-stilar.
 *  - Typography per ROLL: Display för namn, Headline för cue, Label
 *    för metrics. Inte storleksbaserat.
 *  - Predictable nav: ◀▶ alltid = navigate, HoldOK = next exercise.
 *    OK gör ingenting (allt syns redan).
 *  - Reducerat info-density: skytte-info → hero, metrics → kompakta
 *    chips, alla andra skyttar → bottom-strip avatar-style.
 *
 * Fjärr-grammatik:
 *   ◀ ▶       → navigate lanes (cyclic)
 *   HOLD OK   → next exercise / end session
 *   OK        → no-op (allt syns)
 *   BACK      → no-op
 */

interface LaneInfo {
  lane_number: number;
  name: string | null;
  weapon_name: string | null;
  status: string;
}

const HINTS: RemoteKeyHint[] = [
  { keys: ["◀", "▶"], label: "navigate lanes", primary: true },
  { keys: ["HOLD OK"], label: "next exercise" },
];

const STATUS_COLOR: Record<Status, string> = {
  red: "var(--mui-palette-error-main)",
  yellow: "var(--mui-palette-warning-main)",
  green: "var(--mui-palette-success-main)",
};

const STATUS_TEXT: Record<Status, string> = {
  red: "Needs coaching",
  yellow: "Worth a follow-up",
  green: "On track",
};

// M3 Filled Tonal Card-färger per status — använder containerColor från
// M3-paletten så cue:n känns som en del av temat, inte en alert.
const STATUS_CONTAINER: Record<Status, string> = {
  red: "var(--mui-palette-m3-statusAttentionContainer)",
  yellow: "var(--mui-palette-m3-statusWarningContainer)",
  green: "var(--mui-palette-m3-statusSuccessContainer)",
};
const STATUS_ON_CONTAINER: Record<Status, string> = {
  red: "var(--mui-palette-m3-onErrorContainer)",
  yellow: "var(--mui-palette-text-primary)",
  green: "var(--mui-palette-text-primary)",
};

export function AARDuk({
  exercise,
  section,
  focusIndex,
}: {
  exercise: ExerciseListItem | null;
  section: Section;
  /** Index i prioriterad resultatlista — clampas cykliskt här. */
  focusIndex: number;
  /** Kvar för API-kompat men ignoreras: Immersive List ÄR den fokuserade vyn. */
  zoomed?: boolean;
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

  const safeFocus =
    results.length > 0
      ? ((focusIndex % results.length) + results.length) % results.length
      : 0;

  if (!exercise) {
    return <EmptyState title="No exercise to review" sub="Return to preflight or load an exercise." />;
  }
  if (results.length === 0) {
    return <EmptyState title="No trainees on the lanes" sub="Press OK on the remote to continue." />;
  }

  const focused = results[safeFocus];
  const focusedStatus: Status = worstStatus(focused);

  return (
    <Stack
      sx={{
        flex: 1,
        color: "text.primary",
        // Dynamic hero-tint follows the focused skytts status — content-derived color.
        // Transition between lane-switches creates ambient context change.
        transition: `background-image ${m3Duration.medium3}ms ${m3Easing.emphasized}`,
        ...statusTintedSurface(focusedStatus, "ambient"),
      }}
    >
      {/* Top app bar — Label Medium (M3 role: nav context, not chrome).
          Responsiv overscan: 24px på laptop, full 48dp på projektor. */}
      <Stack
        direction="row"
        spacing={{ xs: 2, md: 4 }}
        sx={{
          px: { xs: "24px", md: "36px", xl: "48px" },
          pt: { xs: "16px", md: "24px", xl: "32px" },
          pb: { xs: "8px", md: "12px", xl: "16px" },
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <Typography
          sx={{
            ...dukTypography.labelLarge,
            letterSpacing: "0.15em",
            color: "text.secondary",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          After Action Review · {exercise.title}
        </Typography>
        <Typography
          sx={{
            ...dukTypography.labelMono,
            color: "text.secondary",
            flexShrink: 0,
          }}
        >
          {safeFocus + 1} of {results.length}
        </Typography>
      </Stack>

      {/* HERO — fokuserad skytt tar hela ytan */}
      <AnimatePresence mode="wait">
        <motion.div
          key={focused.lane}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -16 }}
          transition={{
            duration: prefersReducedMotion ? 0 : m3Duration.medium3 / 1000,
            ease: [0.2, 0, 0, 1],
          }}
          style={{ flex: 1, display: "flex", flexDirection: "column" }}
        >
          <Hero result={focused} exercise={exercise} status={focusedStatus} />
        </motion.div>
      </AnimatePresence>

      {/* Bottom strip — alla skyttar, fokuserad highlighted */}
      <LaneStrip results={results} focusedIndex={safeFocus} />

      <PhaseHints hints={HINTS} />
    </Stack>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* HERO — Immersive treatment av fokuserad skytt                         */
/* ──────────────────────────────────────────────────────────────────── */

function Hero({
  result,
  exercise,
  status,
}: {
  result: AARResult;
  exercise: ExerciseListItem;
  status: Status;
}) {
  // Pick-up line for the most-critical red criterion (the message).
  const cue = useMemo(() => {
    const priorityOrder = ["hit", "time", "spread"] as const;
    for (const crit of priorityOrder) {
      if (result.reds.includes(crit)) {
        return { crit, text: pickCue(result.lane, exercise.id, crit, "red"), severity: "red" as const };
      }
    }
    for (const crit of priorityOrder) {
      if (result.yellows.includes(crit)) {
        return { crit, text: pickCue(result.lane, exercise.id, crit, "yellow"), severity: "yellow" as const };
      }
    }
    return null;
  }, [result, exercise.id]);

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0, // viktigt för att låta children krympa istället för overflow
        display: "grid",
        // Stackar vertikalt på små viewports, grid 50/50 på md+
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: { xs: 3, md: 4, xl: 6 },
        px: { xs: "24px", md: "36px", xl: "48px" },
        py: { xs: "8px", md: "12px", xl: "16px" },
        overflow: "auto", // skydd om någon overflow-edge ändå händer
      }}
    >
      {/* LEFT — skytte-identitet + cue */}
      <Stack
        sx={{ justifyContent: "center", minHeight: 0 }}
        spacing={{ xs: 2, md: 3, xl: 4 }}
      >
        {/* Lane indicator — Label Large */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: { xs: 8, md: 10 },
              height: { xs: 8, md: 10 },
              borderRadius: "50%",
              bgcolor: STATUS_COLOR[status],
              boxShadow: `0 0 12px ${STATUS_COLOR[status]}`,
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              ...dukTypography.labelLarge,
              letterSpacing: "0.3em",
              color: "text.secondary",
            }}
          >
            Lane {result.lane} · {STATUS_TEXT[status]}
          </Typography>
        </Stack>

        {/* Trainee name — Display (hero identity), skalas med viewport */}
        <Typography
          sx={{
            fontSize: { xs: 36, sm: 44, md: 52, lg: 60, xl: 72 },
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-1px",
            color: "text.primary",
          }}
        >
          {result.trainee ?? "—"}
        </Typography>

        {/* Weapon — Body Large */}
        <Typography
          sx={{
            ...dukTypography.bodyLarge,
            color: "text.secondary",
          }}
        >
          {result.weapon ?? "—"}
        </Typography>

        {/* THE MESSAGE — M3 Filled Tonal Card. Responsiv typografi-skala. */}
        {cue ? (
          <Card
            sx={{
              maxWidth: 640,
              bgcolor: STATUS_CONTAINER[cue.severity],
              color: STATUS_ON_CONTAINER[cue.severity],
              borderRadius: "16px",
              borderLeft: "4px solid",
              borderLeftColor: STATUS_COLOR[cue.severity],
              boxShadow: "none",
              px: { xs: 2, md: 3 },
              py: { xs: 2, md: 2.5 },
            }}
          >
            <Typography
              sx={{
                ...dukTypography.labelMedium,
                letterSpacing: "0.3em",
                color: STATUS_COLOR[cue.severity],
                mb: { xs: 1, md: 1.5 },
              }}
            >
              {cue.crit.toUpperCase()} · Coaching cue
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: 16, md: 20, lg: 24, xl: 28 },
                lineHeight: 1.3,
                fontWeight: 400,
              }}
            >
              {cue.text}
            </Typography>
          </Card>
        ) : (
          <Card
            sx={{
              maxWidth: 640,
              bgcolor: STATUS_CONTAINER.green,
              borderRadius: "16px",
              borderLeft: "4px solid",
              borderLeftColor: STATUS_COLOR.green,
              boxShadow: "none",
              px: { xs: 2, md: 3 },
              py: { xs: 2, md: 2.5 },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 16, md: 20, lg: 24, xl: 28 },
                color: "success.main",
                lineHeight: 1.3,
              }}
            >
              ✓ On track across all criteria.
            </Typography>
          </Card>
        )}
      </Stack>

      {/* RIGHT — target (hero visual) + metrics nedanför.
          Target krymper på små viewports. */}
      <Stack
        sx={{ justifyContent: "center", minHeight: 0 }}
        spacing={{ xs: 1.5, md: 2, xl: 3 }}
      >
        <Box
          sx={{
            width: "100%",
            aspectRatio: "1 / 1",
            maxHeight: { xs: "35vh", sm: "40vh", md: "45vh", lg: "50vh", xl: "55vh" },
            mx: "auto",
          }}
        >
          <TargetSvg
            shots={result.sequence.shots}
            status={status}
            annotations={computeAnnotations(result)}
          />
        </Box>
        {/* Metric chips */}
        <Stack
          direction="row"
          spacing={{ xs: 1, md: 1.5, xl: 2 }}
          sx={{ justifyContent: "center" }}
        >
          <Metric
            icon={<GpsFixed sx={{ fontSize: { xs: 16, md: 20 } }} />}
            label="Hits"
            value={String(result.hits)}
            threshold={`≥ ${exercise.hits_threshold ?? "—"}`}
            status={result.hit_status}
          />
          <Metric
            icon={<AccessTime sx={{ fontSize: { xs: 16, md: 20 } }} />}
            label="Time"
            value={`${result.time_seconds}s`}
            threshold={`≤ ${exercise.time_seconds}s`}
            status={result.time_status}
          />
          <Metric
            icon={<CenterFocusStrong sx={{ fontSize: { xs: 16, md: 20 } }} />}
            label="Spread"
            value={`${result.spread_cm}cm`}
            threshold={`≤ ${exercise.spread_threshold}cm`}
            status={result.spread_status}
          />
        </Stack>
      </Stack>
    </Box>
  );
}

function Metric({
  icon,
  label,
  value,
  threshold,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  threshold: string;
  status: Status;
}) {
  return (
    <Stack
      sx={{
        flex: 1,
        maxWidth: { xs: 120, md: 160, xl: 180 },
        alignItems: "center",
        gap: 0.25,
        py: { xs: 1, md: 1.25, xl: 1.5 },
        px: { xs: 0.5, md: 1 },
        borderRadius: "12px",
        border: 1,
        borderColor: "divider",
      }}
    >
      <Stack
        direction="row"
        spacing={{ xs: 0.5, md: 1 }}
        sx={{ alignItems: "center", color: STATUS_COLOR[status] }}
      >
        {icon}
        <Typography
          sx={{
            ...dukTypography.labelMedium,
            letterSpacing: "0.15em",
          }}
        >
          {label}
        </Typography>
      </Stack>
      <Typography
        sx={{
          fontSize: { xs: 24, md: 32, lg: 40, xl: 48 },
          color: STATUS_COLOR[status],
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1,
          fontWeight: 400,
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          ...dukTypography.labelMono,
          color: "text.secondary",
        }}
      >
        {threshold}
      </Typography>
    </Stack>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* LANE STRIP — bottom navigation strip (Netflix-episodes-style)         */
/* ──────────────────────────────────────────────────────────────────── */

function LaneStrip({
  results,
  focusedIndex,
}: {
  results: AARResult[];
  focusedIndex: number;
}) {
  return (
    <Box
      sx={{
        px: { xs: "24px", md: "36px", xl: "48px" },
        py: { xs: "10px", md: "12px", xl: "16px" },
        display: "flex",
        gap: { xs: 1, md: 1.5, xl: 2 },
        justifyContent: "center",
        flexWrap: "wrap",
        borderTop: 1,
        borderColor: "divider",
        flexShrink: 0,
      }}
    >
      {results.map((r, i) => (
        <LaneChip key={r.lane} result={r} focused={i === focusedIndex} />
      ))}
    </Box>
  );
}

function LaneChip({ result, focused }: { result: AARResult; focused: boolean }) {
  const status = worstStatus(result);

  return (
    <Box
      sx={{
        // M3 focus mix: scale + glow + outline + color
        ...tvFocus(focused, "medium"),
        position: "relative",
        minWidth: { xs: 110, md: 130, xl: 160 },
        maxWidth: { xs: 150, md: 180, xl: 220 },
        flex: "0 1 auto",
        borderRadius: { xs: "12px", md: "16px" },
        overflow: "hidden",
        bgcolor: focused
          ? "var(--mui-palette-m3-surfaceContainerHigh)"
          : "var(--mui-palette-m3-surfaceContainer)",
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(255, 255, 255, 1)",
          opacity: focused ? 0.08 : 0,
          pointerEvents: "none",
          transition: "opacity 150ms cubic-bezier(0.2, 0, 0, 1)",
          borderRadius: "inherit",
        },
      }}
    >
      <Stack
        sx={{ position: "relative", zIndex: 1, p: { xs: 1, md: 1.25, xl: 1.5 } }}
        spacing={0.5}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: STATUS_COLOR[status],
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              ...dukTypography.labelMedium,
              letterSpacing: "0.15em",
              color: "text.secondary",
            }}
          >
            Lane {result.lane}
          </Typography>
        </Stack>
        <Typography
          sx={{
            ...dukTypography.titleMedium,
            color: focused ? "text.primary" : "text.secondary",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            transition: "color 200ms",
          }}
        >
          {result.trainee ?? "—"}
        </Typography>
        {/* Compact metric trio — three colored dots */}
        <Stack direction="row" spacing={0.5} sx={{ pt: 0.5 }}>
          <StatusPip status={result.hit_status} />
          <StatusPip status={result.time_status} />
          <StatusPip status={result.spread_status} />
        </Stack>
      </Stack>
    </Box>
  );
}

function StatusPip({ status }: { status: Status }) {
  return (
    <Box
      sx={{
        flex: 1,
        height: 3,
        borderRadius: "999px",
        bgcolor: STATUS_COLOR[status],
        opacity: status === "green" ? 0.5 : 0.9,
      }}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* TARGET SVG — hero visual                                              */
/* ──────────────────────────────────────────────────────────────────── */

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

function TargetSvg({
  shots,
  status,
  annotations,
}: {
  shots: Shot[];
  status: Status;
  annotations: Annotation[];
}) {
  const accent = STATUS_COLOR[status];

  return (
    <svg
      viewBox="-50 -50 100 100"
      style={{
        width: "100%",
        height: "100%",
        // Hela SVG:n ärver text-primary via currentColor. Per M3 audit
        // (skill 2026-05-28): SVG ska INTE hårdkoda färger — använder
        // text-primary som inverteras automatiskt i dark/light.
        color: "var(--mui-palette-text-primary)",
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Target rings — theme-aware via currentColor */}
      <circle cx="0" cy="0" r="48" fill="currentColor" fillOpacity="0.025" stroke="currentColor" strokeOpacity="0.08" strokeWidth="0.4" />
      <circle cx="0" cy="0" r="36" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.4" />
      <circle cx="0" cy="0" r="25" fill="none" stroke="currentColor" strokeOpacity="0.10" strokeWidth="0.4" />
      <circle cx="0" cy="0" r="14" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="0.4" />
      <circle cx="0" cy="0" r="2.5" fill="currentColor" fillOpacity="0.20" />
      <line x1="-5" y1="0" x2="5" y2="0" stroke="currentColor" strokeOpacity="0.10" strokeWidth="0.3" />
      <line x1="0" y1="-5" x2="0" y2="5" stroke="currentColor" strokeOpacity="0.10" strokeWidth="0.3" />

      {/* Status accent ring — subtle ambient */}
      <circle
        cx="0"
        cy="0"
        r="48"
        fill="none"
        stroke={accent}
        strokeOpacity={status === "green" ? 0.2 : status === "yellow" ? 0.4 : 0.55}
        strokeWidth="0.5"
      />

      {/* Annotations — DEFAULT visible (not hidden behind zoom).
          Drawn BEHIND shots so dots stay readable. */}
      {annotations.map((a, i) => {
        if (a.type === "spread-rings") {
          return (
            <g key={`ann-${i}`}>
              <circle
                cx="0"
                cy="0"
                r={a.r_limit}
                fill="none"
                stroke="var(--mui-palette-success-main)"
                strokeOpacity="0.7"
                strokeWidth="0.6"
                strokeDasharray="2,1.5"
              />
              <circle
                cx="0"
                cy="0"
                r={a.r_actual}
                fill="none"
                stroke="var(--mui-palette-error-main)"
                strokeOpacity="0.85"
                strokeWidth="0.7"
                strokeDasharray="2,1.5"
              />
              <text x={a.r_limit + 2} y="-1.5" fill="var(--mui-palette-success-main)" fontSize="3.2" opacity="0.85" fontFamily="ui-monospace, monospace">
                limit
              </text>
              <text x={a.r_actual + 2} y="4" fill="var(--mui-palette-error-main)" fontSize="3.2" opacity="0.9" fontFamily="ui-monospace, monospace">
                actual
              </text>
            </g>
          );
        }
        return (
          <g key={`ann-${i}`}>
            <defs>
              <marker id={`ah-${i}`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill={accent} opacity="0.7" />
              </marker>
            </defs>
            <line
              x1={a.x1}
              y1={a.y1}
              x2={a.x2}
              y2={a.y2}
              stroke={accent}
              strokeWidth="0.9"
              strokeDasharray="2,1.2"
              opacity="0.6"
              markerEnd={`url(#ah-${i})`}
            />
            <text
              x={a.x2}
              y={a.y2 - 3}
              fill={accent}
              fontSize="3.4"
              opacity="0.95"
              fontFamily="ui-monospace, monospace"
              textAnchor="middle"
              fontWeight="600"
            >
              {a.label}
            </text>
          </g>
        );
      })}

      {/* Shots — theme-aware via currentColor. Hits = high-emphasis
          on-surface, misses = lower opacity. Funkar både i dark + light. */}
      {shots.map((shot) => (
        <g key={shot.i}>
          {shot.hit ? (
            <>
              <circle cx={shot.x} cy={shot.y} r="2.4" fill="currentColor" fillOpacity="0.95" />
              <circle cx={shot.x} cy={shot.y} r="3.4" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.4" />
            </>
          ) : (
            <circle cx={shot.x} cy={shot.y} r="1.6" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="0.6" />
          )}
        </g>
      ))}
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* Empty                                                                */
/* ──────────────────────────────────────────────────────────────────── */

function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <Stack sx={{ flex: 1, alignItems: "center", justifyContent: "center", textAlign: "center" }} spacing={2}>
      <Typography sx={{ ...dukTypography.labelLarge, color: "text.secondary" }}>
        After Action Review
      </Typography>
      <Typography sx={{ ...dukTypography.displayMedium, color: "text.primary" }}>
        {title}
      </Typography>
      <Typography sx={{ ...dukTypography.bodyLarge, color: "text.secondary" }}>{sub}</Typography>
    </Stack>
  );
}

function worstStatus(r: AARResult): Status {
  if (r.reds.length > 0) return "red";
  if (r.yellows.length > 0) return "yellow";
  return "green";
}
