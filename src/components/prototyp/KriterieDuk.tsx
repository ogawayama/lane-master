import { Box, Card, Chip, Stack, Typography } from "@mui/material";
import {
  GpsFixed as TargetIcon,
  AccessTime as TimerIcon,
  CenterFocusStrong as SpreadIcon,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import type { ExerciseListItem } from "@/services/sessionService";
import { PhaseHints, type RemoteKeyHint } from "@/components/prototyp/PhaseHints";
import { dukTypography, heroCardSx, tvSafeInset } from "@/theme/tv";

/**
 * Helhetsprototyp — KriterieDuk (M3-omskrivning 2026-05-28).
 *
 * Duken under preflight-fasen. M3 Featured Card med två-kolumns-layout:
 * vänster = övningens titel + objective-label, höger = hero-area med
 * vapen-symbol över gradient (tonal background). Under: tre M3 outlined
 * Chips för Hits/Time/Spread-kriterierna. M3 ikoner från
 * @mui/icons-material.
 *
 * Designspråk: "biograf" — large display type, generös whitespace,
 * inget mus-element. Allt drivs av fjärr.
 */

const PREFLIGHT_HINTS: RemoteKeyHint[] = [
  { keys: ["BACK"], label: "back to check-in" },
  { keys: ["OK"], label: "start exercise", primary: true },
];

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
      <Stack
        sx={{ ...tvSafeInset, flex: 1, alignItems: "center", justifyContent: "center" }}
        spacing={2}
      >
        <Typography sx={{ ...dukTypography.labelLarge, color: "text.secondary" }}>
          Preflight
        </Typography>
        <Typography sx={{ ...dukTypography.displayMedium, color: "text.primary" }}>
          No exercise queued
        </Typography>
        <Typography sx={{ ...dukTypography.bodyLarge, color: "text.secondary" }}>
          Return to pre-pass preparation and add an exercise to the list.
        </Typography>
      </Stack>
    );
  }

  const heroGradient = gradientFor(exercise.weapon);

  return (
    <Stack sx={{ flex: 1 }}>
      {/* Top context-rad */}
      <Box sx={{ px: 6, pt: 6, display: "flex", justifyContent: "space-between" }}>
        <Typography sx={{ ...dukTypography.labelMedium, color: "text.secondary" }}>
          Preflight {totalExercises > 1 ? `· Exercise ${exerciseNumber} of ${totalExercises}` : ""}
        </Typography>
        <Typography
          sx={{
            ...dukTypography.labelMedium,
            fontFamily: '"Roboto Mono", monospace',
            color: "text.secondary",
          }}
        >
          {exercise.weapon ?? "—"}
        </Typography>
      </Box>

      {/* Hero — title + visual */}
      <Box
        sx={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          px: 6,
          py: 4,
        }}
      >
        <Stack sx={{ justifyContent: "center" }} spacing={3}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Typography sx={{ ...dukTypography.labelLarge, color: "text.secondary", mb: 2 }}>
              Today's objective
            </Typography>
            <Typography sx={{ ...dukTypography.displayMedium, color: "text.primary" }}>
              {exercise.title}
            </Typography>
          </motion.div>
        </Stack>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ display: "flex" }}
        >
          <Card
            sx={{
              ...heroCardSx,
              flex: 1,
              background: heroGradient,
              position: "relative",
              minHeight: 0,
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SpreadIcon sx={{ fontSize: 200, color: "rgba(255,255,255,0.18)" }} />
            </Box>
            <Stack
              sx={{
                position: "absolute",
                bottom: 24,
                left: 24,
                right: 24,
                alignItems: "center",
              }}
              spacing={0.5}
            >
              <Typography sx={{ ...dukTypography.labelMedium, color: "rgba(255,255,255,0.6)" }}>
                Weapon
              </Typography>
              <Typography sx={{ ...dukTypography.headlineSmall, color: "white" }}>
                {exercise.weapon ?? "—"}
              </Typography>
            </Stack>
          </Card>
        </motion.div>
      </Box>

      {/* Pass-criteria */}
      <Box sx={{ px: 6, pb: 4 }}>
        <Typography sx={{ ...dukTypography.labelMedium, color: "text.secondary", mb: 2 }}>
          Pass criteria
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
          <CriterionCard
            icon={<TargetIcon sx={{ fontSize: 28 }} />}
            label="Hits"
            value={`≥ ${exercise.hits_threshold ?? "—"}`}
          />
          <CriterionCard
            icon={<TimerIcon sx={{ fontSize: 28 }} />}
            label="Time"
            value={
              exercise.time_seconds !== undefined
                ? `≤ ${exercise.time_seconds}s`
                : "—"
            }
          />
          <CriterionCard
            icon={<SpreadIcon sx={{ fontSize: 28 }} />}
            label="Spread"
            value={`≤ ${exercise.spread_threshold ?? "—"} cm`}
          />
        </Box>
      </Box>

      <PhaseHints hints={PREFLIGHT_HINTS} />
    </Stack>
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
    <Card
      sx={{
        bgcolor: "var(--mui-palette-m3-surfaceContainerLow)",
        borderRadius: "20px",
        p: 3,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", color: "text.secondary" }}>
        {icon}
        <Typography sx={{ ...dukTypography.labelMedium }}>{label}</Typography>
      </Stack>
      <Typography sx={{ ...dukTypography.headlineMedium, color: "text.primary" }}>
        {value}
      </Typography>
    </Card>
  );
}

// Stable gradient per weapon — using M3 tertiary tone to feel coherent.
function gradientFor(weapon?: string): string {
  if (!weapon) {
    return "linear-gradient(135deg, var(--mui-palette-m3-surfaceContainerHigh) 0%, var(--mui-palette-m3-surfaceContainer) 100%)";
  }
  const seed = [...weapon].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = seed % 360;
  return `linear-gradient(135deg, hsl(${hue} 35% 22%) 0%, hsl(${(hue + 40) % 360} 50% 10%) 100%)`;
}
