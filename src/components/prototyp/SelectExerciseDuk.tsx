import { Box, Card, Chip, Stack, Typography } from "@mui/material";
import { PlayArrow, CenterFocusStrong } from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import type { ExerciseListItem } from "@/services/sessionService";
import { PhaseHints, type RemoteKeyHint } from "@/components/prototyp/PhaseHints";
import {
  carouselItemSx,
  dukTypography,
  focusRing,
  heroCardSx,
  tvSafeInset,
} from "@/theme/tv";

/**
 * Helhetsprototyp — SelectExerciseDuk (M3-omskrivning 2026-05-28).
 *
 * Implementerar Google TV:s Featured Carousel-pattern (per
 * developer.android.com/design/ui/tv § Components):
 *   • Hero-area med stort kort för aktuell highlight
 *   • Thumbnail-strip nedanför med focus-rings på vald
 *   • D-pad-driven ◀ ▶ för bläddring
 *
 * Använder M3-tokens från CssVarsProvider + dukTypography för 10-foot
 * läsbarhet. Featured Carousel-shape (28px corner radius) per spec.
 */

const SELECT_HINTS: RemoteKeyHint[] = [
  { keys: ["◀", "▶"], label: "browse" },
  { keys: ["OK"], label: "start with this exercise", primary: true },
];

export function SelectExerciseDuk({
  exercises,
  selectedIndex,
}: {
  exercises: ExerciseListItem[];
  selectedIndex: number;
}) {
  if (exercises.length === 0) {
    return (
      <Stack
        sx={{ ...tvSafeInset, flex: 1, alignItems: "center", justifyContent: "center" }}
        spacing={2}
      >
        <Typography sx={{ ...dukTypography.labelLarge, color: "text.secondary" }}>
          Today's session
        </Typography>
        <Typography sx={{ ...dukTypography.displayMedium, color: "text.primary" }}>
          No exercises planned
        </Typography>
        <Typography sx={{ ...dukTypography.bodyLarge, color: "text.secondary" }}>
          Open /tablet/prepare to add exercises before starting.
        </Typography>
      </Stack>
    );
  }

  const safeIndex = Math.max(0, Math.min(selectedIndex, exercises.length - 1));
  const current = exercises[safeIndex];

  return (
    <Stack sx={{ flex: 1 }}>
      <Box sx={{ px: 6, pt: 6 }}>
        <Typography sx={{ ...dukTypography.labelMedium, color: "text.secondary" }}>
          Today's session · {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
        </Typography>
      </Box>

      {/* Hero — Featured Carousel-stil per Android TV Compose */}
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", px: 6, py: 3 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ width: "100%", maxWidth: 1280 }}
          >
            <Card
              sx={{
                ...heroCardSx,
                aspectRatio: "16 / 7",
                background: gradientFor(current.weapon),
                display: "flex",
                position: "relative",
              }}
            >
              {/* Left: text content */}
              <Stack
                sx={{
                  position: "relative",
                  zIndex: 1,
                  justifyContent: "center",
                  p: 6,
                  maxWidth: "55%",
                }}
                spacing={3}
              >
                <Typography
                  sx={{
                    ...dukTypography.labelMedium,
                    color: "rgba(255,255,255,0.65)",
                  }}
                >
                  {safeIndex === 0
                    ? "First up"
                    : `Exercise ${safeIndex + 1} of ${exercises.length}`}
                </Typography>
                <Typography
                  sx={{
                    ...dukTypography.displayMedium,
                    color: "white",
                  }}
                >
                  {current.title}
                </Typography>
                <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {current.weapon && <HeroChip>{current.weapon}</HeroChip>}
                  {current.hits_threshold !== undefined && (
                    <HeroChip>Hits ≥ {current.hits_threshold}</HeroChip>
                  )}
                  {current.time_seconds !== undefined && (
                    <HeroChip>Time ≤ {current.time_seconds}s</HeroChip>
                  )}
                  {current.spread_threshold !== undefined && (
                    <HeroChip>Spread ≤ {current.spread_threshold} cm</HeroChip>
                  )}
                </Stack>
                <SelectCta />
              </Stack>

              {/* Right: visual placeholder (gradient + symbol) */}
              <Box
                sx={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: "55%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to left, transparent, transparent, rgba(0,0,0,0.4))",
                  }}
                />
                <CenterFocusStrong
                  sx={{ fontSize: 260, color: "rgba(255,255,255,0.15)", strokeWidth: 0.5 }}
                />
              </Box>
            </Card>
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Thumbnail-strip */}
      <Box sx={{ px: 6, pb: 2 }}>
        <Stack direction="row" spacing={3} sx={{ alignItems: "center", mb: 2 }}>
          <Typography sx={{ ...dukTypography.labelMedium, color: "text.secondary" }}>
            In order
          </Typography>
          <Box sx={{ flex: 1, height: 1, bgcolor: "divider" }} />
        </Stack>
        <Stack direction="row" spacing={2} sx={{ overflow: "hidden" }}>
          {exercises.map((ex, i) => (
            <Thumbnail
              key={`${ex.id}-${i}`}
              exercise={ex}
              index={i}
              selected={i === safeIndex}
              total={exercises.length}
            />
          ))}
        </Stack>
      </Box>

      <PhaseHints hints={SELECT_HINTS} />
    </Stack>
  );
}

function HeroChip({ children }: { children: React.ReactNode }) {
  return (
    <Chip
      label={children}
      variant="outlined"
      sx={{
        bgcolor: "rgba(255,255,255,0.08)",
        borderColor: "rgba(255,255,255,0.25)",
        color: "rgba(255,255,255,0.85)",
        fontFamily: '"Roboto Mono", monospace',
        fontSize: "14px",
        height: 32,
        borderRadius: "16px",
      }}
    />
  );
}

function SelectCta() {
  return (
    <Box
      aria-hidden
      sx={{
        display: "inline-flex",
        alignSelf: "flex-start",
        alignItems: "center",
        gap: 1.5,
        bgcolor: "primary.main",
        color: "primary.contrastText",
        px: 4,
        py: 1.5,
        borderRadius: "9999px",
        boxShadow: 4,
        ...dukTypography.labelLarge,
      }}
    >
      <PlayArrow sx={{ fontSize: 24 }} />
      Press OK to select
    </Box>
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
  const width = total <= 3 ? 320 : total <= 5 ? 240 : 200;
  return (
    <motion.div
      layout
      style={{
        width,
        flexShrink: 0,
        aspectRatio: "16 / 9",
        opacity: selected ? 1 : 0.5,
        scale: selected ? 1.04 : 1,
      }}
    >
      <Card
        sx={{
          borderRadius: "20px",
          overflow: "hidden",
          outline: selected ? "3px solid" : "none",
          outlineColor: "primary.main",
          outlineOffset: "4px",
          height: "100%",
          background: gradientFor(exercise.weapon),
          position: "relative",
          transition: "all 200ms cubic-bezier(0.2, 0, 0, 1)",
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
          <CenterFocusStrong
            sx={{
              fontSize: 56,
              color: selected ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)",
            }}
          />
        </Box>
        <Typography
          sx={{
            position: "absolute",
            top: 8,
            left: 10,
            fontFamily: '"Roboto Mono", monospace',
            fontSize: 11,
            color: "rgba(255,255,255,0.6)",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </Typography>
        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            p: 1.5,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.3), transparent)",
          }}
        >
          <Typography
            sx={{
              color: "white",
              fontSize: 13,
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {exercise.title}
          </Typography>
        </Box>
      </Card>
    </motion.div>
  );
}

function gradientFor(weapon?: string): string {
  if (!weapon) {
    return "linear-gradient(135deg, var(--mui-palette-m3-surfaceContainerHigh) 0%, var(--mui-palette-m3-surfaceContainer) 100%)";
  }
  const seed = [...weapon].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = seed % 360;
  return `linear-gradient(135deg, hsl(${hue} 35% 22%) 0%, hsl(${(hue + 40) % 360} 50% 10%) 100%)`;
}
