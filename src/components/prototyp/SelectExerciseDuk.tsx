import { Box, Card, Chip, Stack, Typography } from "@mui/material";
import { PlayArrow, CenterFocusStrong } from "@mui/icons-material";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { ExerciseListItem } from "@/services/sessionService";
import { PhaseHints, type RemoteKeyHint } from "@/components/prototyp/PhaseHints";
import { tvFocus, m3Duration } from "@/theme/m3State";

/**
 * SelectExerciseDuk — M3 Hero Carousel (redesign 2026-05-28).
 *
 * Canonical M3 TV Featured/Hero Carousel-pattern:
 *  - Full-width hero med en featured item åt gången
 *  - ◀▶ paginerar — emphasized cross-fade animation
 *  - Page indicators längst ner (M3 small dots/lines)
 *  - Theme-aware via currentColor + M3-tokens (funkar i båda lägen)
 *  - Responsiv: hero skalar, page indicators wrap vid behov
 *
 * Skillnad mot tidigare implementation:
 *  - Tidigare: hero-kort + thumbnail-strip (mer av en Compilation)
 *  - Nu: enbart hero + dot-indicators (renaste Hero Carousel)
 *  - Cleaner, mer focused på den aktiva övningen
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
  const prefersReducedMotion = useReducedMotion();

  if (exercises.length === 0) {
    return (
      <Stack
        sx={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 3, md: 6 },
        }}
        spacing={2}
      >
        <Typography
          sx={{
            fontSize: { xs: 10, md: 12 },
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          Today's session
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: 36, md: 48, xl: 64 },
            fontWeight: 400,
            color: "text.primary",
            textAlign: "center",
          }}
        >
          No exercises planned
        </Typography>
        <Typography sx={{ fontSize: 14, color: "text.secondary", textAlign: "center" }}>
          Open /tablet/prepare to add exercises before starting.
        </Typography>
      </Stack>
    );
  }

  const safeIndex = Math.max(0, Math.min(selectedIndex, exercises.length - 1));
  const current = exercises[safeIndex];

  return (
    <Stack sx={{ flex: 1 }}>
      {/* Top context — Label Medium */}
      <Box
        sx={{
          px: { xs: "24px", md: "36px", xl: "48px" },
          pt: { xs: "16px", md: "24px", xl: "32px" },
          pb: { xs: "8px", md: "12px" },
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: 11, md: 13, xl: 14 },
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            fontWeight: 500,
            color: "text.secondary",
          }}
        >
          Today's session · {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
        </Typography>
      </Box>

      {/* HERO — full-width Featured Carousel item */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: "16px", md: "32px", xl: "48px" },
          py: { xs: 1, md: 2 },
          minHeight: 0,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.97 }}
            transition={{
              duration: prefersReducedMotion ? 0 : m3Duration.medium3 / 1000,
              ease: [0.2, 0, 0, 1],
            }}
            style={{ width: "100%", maxWidth: 1400 }}
          >
            <Card
              sx={{
                position: "relative",
                aspectRatio: { xs: "16 / 9", md: "16 / 8", xl: "16 / 7" },
                borderRadius: { xs: "20px", md: "28px" },
                overflow: "hidden",
                bgcolor: "var(--mui-palette-m3-surfaceContainerHigh)",
                boxShadow: "none",
                background: gradientFor(current.weapon),
              }}
            >
              {/* Left content panel — text + chips + CTA */}
              <Stack
                sx={{
                  position: "relative",
                  zIndex: 1,
                  justifyContent: "center",
                  height: "100%",
                  p: { xs: 3, md: 5, xl: 7 },
                  maxWidth: { xs: "100%", md: "60%" },
                }}
                spacing={{ xs: 2, md: 3 }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: 11, md: 13, xl: 14 },
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {safeIndex === 0 ? "First up" : `Exercise ${safeIndex + 1} of ${exercises.length}`}
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: 28, md: 44, lg: 56, xl: 72 },
                    fontWeight: 400,
                    lineHeight: 1.05,
                    letterSpacing: "-0.5px",
                    color: "#ffffff",
                  }}
                >
                  {current.title}
                </Typography>

                {/* M3 Chips for criteria */}
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: "wrap", gap: { xs: 0.75, md: 1 } }}
                >
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

              {/* Right visual area — gradient bleed + symbol */}
              <Box
                sx={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: { xs: "30%", md: "45%" },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to left, transparent, transparent 30%, rgba(0,0,0,0.5))",
                  }}
                />
                <CenterFocusStrong
                  sx={{
                    fontSize: { xs: 120, md: 200, xl: 280 },
                    color: "rgba(255,255,255,0.16)",
                    strokeWidth: 0.5,
                  }}
                />
              </Box>
            </Card>
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* M3 page indicators — pill-formade, focused = primary färg + bredd */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: { xs: 0.75, md: 1 },
          px: 2,
          py: { xs: 1, md: 1.5 },
          flexWrap: "wrap",
        }}
      >
        {exercises.map((_, i) => (
          <PageIndicator key={i} active={i === safeIndex} />
        ))}
      </Box>

      <PhaseHints hints={SELECT_HINTS} />
    </Stack>
  );
}

function HeroChip({ children }: { children: React.ReactNode }) {
  return (
    <Chip
      label={children}
      sx={{
        bgcolor: "rgba(255,255,255,0.12)",
        color: "rgba(255,255,255,0.92)",
        fontFamily: '"Roboto Mono", monospace',
        fontSize: { xs: 11, md: 13 },
        height: { xs: 28, md: 32 },
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.18)",
        "& .MuiChip-label": { px: { xs: 1.25, md: 1.5 } },
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
        bgcolor: "#ffffff",
        color: "#000000",
        px: { xs: 2.5, md: 3.5 },
        py: { xs: 1, md: 1.5 },
        borderRadius: "9999px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        fontSize: { xs: 13, md: 15 },
        fontWeight: 500,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      <PlayArrow sx={{ fontSize: { xs: 18, md: 22 } }} />
      Press OK to select
    </Box>
  );
}

function PageIndicator({ active }: { active: boolean }) {
  return (
    <Box
      sx={{
        ...tvFocus(false), // ingen tv-focus per dot — selected hanteras via storlek/färg
        height: 6,
        width: active ? 28 : 6,
        borderRadius: "999px",
        bgcolor: active ? "primary.main" : "text.disabled",
        opacity: active ? 1 : 0.4,
        transition: "all 240ms cubic-bezier(0.2, 0, 0, 1)",
      }}
    />
  );
}

// Stabil gradient per vapen — väl-skalig i båda themes via HSL.
function gradientFor(weapon?: string): string {
  if (!weapon) {
    return "linear-gradient(135deg, hsl(200 25% 25%) 0%, hsl(220 30% 15%) 100%)";
  }
  const seed = [...weapon].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = seed % 360;
  return `linear-gradient(135deg, hsl(${hue} 45% 30%) 0%, hsl(${(hue + 40) % 360} 55% 18%) 100%)`;
}
