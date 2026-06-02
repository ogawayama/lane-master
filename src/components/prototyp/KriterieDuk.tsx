import { Box, Card, Chip, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  GpsFixed as TargetIcon,
  AccessTime as TimerIcon,
  CenterFocusStrong as SpreadIcon,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import type { ExerciseListItem } from "@/services/sessionService";
import { PhaseHints, type RemoteKeyHint } from "@/components/prototyp/PhaseHints";
import { dukTypography } from "@/theme/tv";

/**
 * KriterieDuk — M3 Content Details layout (redesign 2026-05-28).
 *
 * Canonical M3 TV Content Details: information + primary visual + actions.
 *  - Vänster: hero text (objective + title) som Display + Body
 *  - Höger: primary visual (gradient + symbol) som hero image
 *  - Under: M3 Assist Chips för Hits/Time/Spread (canonical M3 component
 *    för "smutsig labelled-värde", inte cards)
 *  - Theme-aware: gradient anpassar sig till dark/light via HSL
 *  - Responsiv: 2-col grid på md+, stackad 1-col på xs/sm
 *  - M3 type roles: Display för titel, Label för section-headers
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
  const theme = useTheme();
  const isSaab = (theme.palette as { m3?: { brand?: string } }).m3?.brand === "saab";
  if (awaitingExercise || !exercise) {
    return (
      <Stack
        sx={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          px: { xs: 3, md: 6 },
        }}
        spacing={2}
      >
        <Typography
          sx={{
            fontSize: { xs: 11, md: 13 },
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          Preflight
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: 36, md: 48, xl: 64 },
            fontWeight: 400,
            color: "text.primary",
          }}
        >
          No exercise queued
        </Typography>
        <Typography sx={{ fontSize: 14, color: "text.secondary", maxWidth: 480 }}>
          Return to pre-pass preparation and add an exercise to the list.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack sx={{ flex: 1 }}>
      {/* Top context — Label Medium */}
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: "baseline",
          justifyContent: "space-between",
          px: { xs: "24px", md: "36px", xl: "48px" },
          pt: { xs: "16px", md: "24px", xl: "32px" },
          pb: { xs: "8px", md: "12px" },
        }}
      >
        <Typography
          sx={{
            ...dukTypography.labelLarge,
            letterSpacing: "0.3em",
            color: "text.secondary",
          }}
        >
          Preflight{totalExercises > 1 ? ` · Exercise ${exerciseNumber} of ${totalExercises}` : ""}
        </Typography>
        <Typography
          sx={{
            ...dukTypography.labelMono,
            color: "text.secondary",
            flexShrink: 0,
          }}
        >
          {exercise.weapon ?? "—"}
        </Typography>
      </Stack>

      {/* Content Details — vänster text, höger visual */}
      <Box
        sx={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: { xs: 3, md: 5, xl: 6 },
          px: { xs: "24px", md: "36px", xl: "48px" },
          py: { xs: "8px", md: "16px" },
          minHeight: 0,
        }}
      >
        {/* LEFT — objective text */}
        <Stack sx={{ justifyContent: "center", minHeight: 0 }} spacing={{ xs: 2, md: 3 }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
          >
            <Typography
              sx={{
                ...dukTypography.labelLarge,
                letterSpacing: "0.3em",
                color: "text.secondary",
                mb: { xs: 1.5, md: 2 },
              }}
            >
              Today's objective
            </Typography>
            <Typography
              sx={{
                ...dukTypography.displayMedium,
                letterSpacing: "-1px",
                color: "text.primary",
              }}
            >
              {exercise.title}
            </Typography>
          </motion.div>
        </Stack>

        {/* RIGHT — primary visual (gradient + symbol) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
          style={{ display: "flex", minHeight: 0 }}
        >
          <Card
            sx={{
              flex: 1,
              minHeight: { xs: 180, md: 280 },
              borderRadius: { xs: "20px", md: "28px" },
              overflow: "hidden",
              position: "relative",
              background: gradientFor(exercise.weapon, isSaab),
              boxShadow: "none",
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
              <SpreadIcon
                sx={{
                  fontSize: { xs: 140, md: 200, xl: 260 },
                  color: "rgba(255,255,255,0.20)",
                  strokeWidth: 0.5,
                }}
              />
            </Box>
            <Stack
              sx={{
                position: "absolute",
                bottom: { xs: 16, md: 24 },
                left: { xs: 16, md: 24 },
                right: { xs: 16, md: 24 },
                alignItems: "center",
              }}
              spacing={0.5}
            >
              <Typography
                sx={{
                  ...dukTypography.labelMedium,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Weapon
              </Typography>
              <Typography
                sx={{
                  ...dukTypography.headlineSmall,
                  fontWeight: 500,
                  color: "#ffffff",
                }}
              >
                {exercise.weapon ?? "—"}
              </Typography>
            </Stack>
          </Card>
        </motion.div>
      </Box>

      {/* M3 Assist Chips — canonical för labelled value */}
      <Box sx={{ px: { xs: "24px", md: "36px", xl: "48px" }, pb: { xs: 2, md: 3 } }}>
        <Typography
          sx={{
            ...dukTypography.labelLarge,
            letterSpacing: "0.3em",
            color: "text.secondary",
            mb: { xs: 1, md: 1.5 },
          }}
        >
          Pass criteria
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          <CriterionChip
            icon={<TargetIcon sx={{ fontSize: 18 }} />}
            label="Hits"
            value={`≥ ${exercise.hits_threshold ?? "—"}`}
          />
          <CriterionChip
            icon={<TimerIcon sx={{ fontSize: 18 }} />}
            label="Time"
            value={
              exercise.time_seconds !== undefined ? `≤ ${exercise.time_seconds}s` : "—"
            }
          />
          <CriterionChip
            icon={<SpreadIcon sx={{ fontSize: 18 }} />}
            label="Spread"
            value={`≤ ${exercise.spread_threshold ?? "—"} cm`}
          />
        </Stack>
      </Box>

      <PhaseHints hints={PREFLIGHT_HINTS} />
    </Stack>
  );
}

function CriterionChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Chip
      icon={icon as React.ReactElement}
      label={
        <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
          <Typography
            component="span"
            sx={{
              ...dukTypography.labelMedium,
              letterSpacing: "0.25em",
              color: "text.secondary",
            }}
          >
            {label}
          </Typography>
          <Typography
            component="span"
            sx={{
              ...dukTypography.titleMedium,
              color: "text.primary",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </Typography>
        </Stack>
      }
      sx={{
        height: { xs: 36, md: 40 },
        borderRadius: "10px",
        bgcolor: "var(--mui-palette-m3-surfaceContainerLow)",
        border: 1,
        borderColor: "divider",
        px: 0.5,
        "& .MuiChip-icon": { color: "text.secondary", ml: 1 },
        "& .MuiChip-label": { px: 1.5 },
      }}
    />
  );
}

// Stable gradient per weapon — funkar i båda themes via HSL med moderate
// saturation/lightness som ger god kontrast oavsett scheme.
function gradientFor(weapon?: string, isSaab = false): string {
  if (isSaab) {
    return "linear-gradient(135deg, #303032 0%, #1A1A1B 100%)";
  }
  if (!weapon) {
    return "linear-gradient(135deg, hsl(200 25% 25%) 0%, hsl(220 30% 15%) 100%)";
  }
  const seed = [...weapon].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = seed % 360;
  return `linear-gradient(135deg, hsl(${hue} 45% 30%) 0%, hsl(${(hue + 40) % 360} 55% 18%) 100%)`;
}
