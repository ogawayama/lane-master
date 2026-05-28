import { Box, Chip, Stack, Typography } from "@mui/material";
import { dukTypography } from "@/theme/tv";

/**
 * Helhetsprototyp — PhaseHints (M3-omskrivning 2026-05-28).
 *
 * Enhetlig hint-rad nederst på duken som visar tillgängliga fjärrknappar
 * i aktuell fas. M3 BottomAppBar-inspirerad: tonal-tinted surface,
 * keyboard-chips renderade som M3 outlined Chips med fast font.
 *
 * dukTypography labelLarge ger 16px/uppercase — läsbart på 10 fot.
 */

export interface RemoteKeyHint {
  /** Knapp(ar) som visas som kbd-style chip(s). T.ex. ["◀", "▶"] eller ["OK"]. */
  keys: string[];
  /** Kort åtgärdsbeskrivning. T.ex. "select trainee", "next exercise". */
  label: string;
  /** Optional: starkare visuell vikt (för fasens primära action). */
  primary?: boolean;
}

export function PhaseHints({ hints }: { hints: RemoteKeyHint[] }) {
  if (hints.length === 0) return null;
  return (
    <Box
      sx={{
        px: 6,
        pb: 4,
        pt: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
      }}
    >
      {hints.map((h, i) => (
        <Stack
          key={`${h.label}-${i}`}
          direction="row"
          spacing={3}
          sx={{ alignItems: "center" }}
        >
          {i > 0 && (
            <Typography
              sx={{
                color: "divider",
                fontSize: "16px",
              }}
            >
              ·
            </Typography>
          )}
          <Hint hint={h} />
        </Stack>
      ))}
    </Box>
  );
}

function Hint({ hint }: { hint: RemoteKeyHint }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
      <Stack direction="row" spacing={0.5}>
        {hint.keys.map((k) => (
          <Chip
            key={k}
            label={k}
            variant="outlined"
            size="small"
            sx={{
              height: 32,
              minWidth: 32,
              borderRadius: "8px",
              fontFamily: '"Roboto Mono", monospace',
              fontSize: "13px",
              fontWeight: 500,
              borderColor: hint.primary ? "primary.main" : "outline",
              borderWidth: hint.primary ? 1.5 : 1,
              color: hint.primary ? "primary.main" : "text.secondary",
              "& .MuiChip-label": { px: 1.5 },
            }}
          />
        ))}
      </Stack>
      <Typography
        sx={{
          ...dukTypography.labelMedium,
          color: hint.primary ? "text.primary" : "text.secondary",
          opacity: hint.primary ? 0.95 : 0.7,
        }}
      >
        {hint.label}
      </Typography>
    </Stack>
  );
}
