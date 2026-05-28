import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Box, Stack, Typography } from "@mui/material";
import { supabase } from "@/integrations/supabase/client";
import { buildShotSequence, type Shot } from "@/services/shotSimulation";
import type { ExerciseListItem, Section } from "@/services/sessionService";
import { PhaseHints, type RemoteKeyHint } from "@/components/prototyp/PhaseHints";
import { dukTypography } from "@/theme/tv";

/**
 * Helhetsprototyp — SimulationDuk (M3-omskrivning 2026-05-28).
 *
 * Papptavlor per upptagen bana, skott dyker upp över tid (deterministisk
 * sekvens från shotSimulation.ts). Ren bild — inga triage-färger på
 * duken under övning. M3-chrome runt: live-indikator som M3 status-dot,
 * timer i extra-large mono-font (dukTypography.timerHero), nedräkning
 * subtilt placerad övre höger.
 */

const EXERCISE_HINTS: RemoteKeyHint[] = [
  { keys: ["OK"], label: "end early", primary: true },
];

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

  const sequences = useMemo<LaneSequence[]>(() => {
    if (!exercise) return [];
    return lanes.map((l) => {
      const seq = buildShotSequence(l.lane_number, exercise);
      return { ...l, shots: seq.shots, total_shots: seq.total_shots };
    });
  }, [lanes, exercise]);

  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (!exercise) return;
    setElapsedMs(0);
    const start = performance.now();
    let rafId = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      setElapsedMs(elapsed);
      if (elapsed < totalMs) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [exercise?.id, totalMs]);

  useEffect(() => {
    if (totalMs > 0 && elapsedMs >= totalMs) onEnd();
  }, [elapsedMs, totalMs, onEnd]);

  if (!exercise) {
    return (
      <Stack sx={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Typography sx={{ ...dukTypography.displayMedium, color: "text.primary" }}>
          No exercise running
        </Typography>
      </Stack>
    );
  }

  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const mm = String(Math.floor(remainingMs / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0");

  return (
    <Stack sx={{ flex: 1 }}>
      {/* Header — Live + title + timer */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          alignItems: "baseline",
          px: 6,
          pt: 5,
          pb: 3,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: "error.main",
              animation: "pulse 1.4s ease-in-out infinite",
              "@keyframes pulse": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.25 },
              },
            }}
          />
          <Typography sx={{ ...dukTypography.labelMedium, color: "text.secondary" }}>
            Live · Exercise running
          </Typography>
        </Stack>
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
            ...dukTypography.titleLarge,
            color: "text.primary",
            textAlign: "right",
            fontFamily: '"Roboto Mono", monospace',
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {mm}:{ss}
        </Typography>
      </Box>

      {/* Lane targets row */}
      <Box
        sx={{
          flex: 1,
          px: 4,
          pb: 4,
          display: "grid",
          alignItems: "end",
          gap: 3,
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
          <Typography
            sx={{
              ...dukTypography.bodyLarge,
              gridColumn: "1 / -1",
              textAlign: "center",
              color: "text.disabled",
            }}
          >
            No lanes occupied.
          </Typography>
        )}
      </Box>

      <PhaseHints hints={EXERCISE_HINTS} />
    </Stack>
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
  const prefersReducedMotion = useReducedMotion();
  return (
    <Stack sx={{ alignItems: "center" }} spacing={2}>
      <Box sx={{ position: "relative", width: "100%", maxWidth: 320, aspectRatio: "1 / 1" }}>
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

          <AnimatePresence>
            {shots.map((shot) => (
              <motion.g
                key={shot.i}
                initial={prefersReducedMotion ? { opacity: 1 } : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: "easeOut" }}
              >
                {shot.hit ? (
                  <>
                    <circle cx={shot.x} cy={shot.y} r="2.6" fill="#ffffff" opacity="0.92" />
                    <circle cx={shot.x} cy={shot.y} r="3.6" fill="none" stroke="#ffffff" strokeOpacity="0.20" strokeWidth="0.4" />
                  </>
                ) : (
                  <circle cx={shot.x} cy={shot.y} r="1.8" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="0.5" />
                )}
              </motion.g>
            ))}
          </AnimatePresence>
        </svg>
      </Box>
      <Stack sx={{ alignItems: "center" }}>
        <Typography sx={{ ...dukTypography.labelMedium, color: "text.secondary" }}>
          Lane {laneNumber}
        </Typography>
        <Typography
          sx={{
            ...dukTypography.titleLarge,
            color: "text.primary",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 240,
          }}
        >
          {name ?? "—"}
        </Typography>
        <Typography
          sx={{
            fontSize: 11,
            fontFamily: '"Roboto Mono", monospace',
            color: "text.disabled",
            mt: 0.5,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {shots.length} / {totalShots} shots
        </Typography>
      </Stack>
    </Stack>
  );
}
