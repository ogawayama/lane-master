import { Box, Chip, Dialog, DialogContent, Stack, Typography } from "@mui/material";
import { Warning as WarningIcon } from "@mui/icons-material";
import type { DerivedAlert } from "@/services/readinessService";
import { dukTypography } from "@/theme/tv";

/**
 * Helhetsprototyp — StartConfirmOverlay (M3-omskrivning 2026-05-28).
 *
 * M3 Dialog (full-screen-modal-shape, 28px corner radius) över Bangrid
 * när instruktören trycker OK med ej-all-gröna lanes. Confirmation-
 * pattern per M3-guideline. BACK/OK-affordances längst ner är visuella
 * "knapp-attrappar" matchande Bangrid:s NEXT-stil för konsekvens.
 *
 * Per user-beslut 2026-05-26 (Q1 = B): inte hård gräns, instruktören
 * får sista ordet men måste bekräfta att hen sett avvikelserna.
 */

export function StartConfirmOverlay({
  alerts,
  laneCount,
  readyCount,
}: {
  alerts: DerivedAlert[];
  laneCount: number;
  readyCount: number;
}) {
  return (
    <Dialog
      open
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            width: "100%",
            maxWidth: 920,
            bgcolor: "var(--mui-palette-m3-surfaceContainerHigh)",
            color: "text.primary",
            border: 1,
            borderColor: "warning.main",
            borderRadius: "28px",
          },
        },
        backdrop: {
          sx: {
            bgcolor: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(4px)",
          },
        },
      }}
    >
      <DialogContent sx={{ p: 6 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
          <WarningIcon sx={{ color: "warning.main", fontSize: 32 }} />
          <Typography sx={{ ...dukTypography.labelLarge, color: "warning.main" }}>
            Confirmation
          </Typography>
        </Stack>
        <Typography sx={{ ...dukTypography.headlineLarge, color: "text.primary", mb: 4 }}>
          Start with {laneCount - readyCount} lane{laneCount - readyCount === 1 ? "" : "s"} not ready?
        </Typography>

        <Stack spacing={1.5} sx={{ mb: 5 }}>
          {alerts.map((a) => (
            <Stack
              key={`${a.indicator}-${a.severity}`}
              direction="row"
              spacing={2}
              sx={{
                alignItems: "baseline",
                borderRadius: 1.5,
                border: 1,
                borderColor:
                  a.severity === "critical"
                    ? "error.main"
                    : "warning.main",
                bgcolor:
                  a.severity === "critical"
                    ? "var(--mui-palette-m3-errorContainer)"
                    : "var(--mui-palette-m3-statusWarningContainer)",
                px: 2.5,
                py: 1.75,
              }}
            >
              <Chip
                label={a.severity}
                size="small"
                sx={{
                  bgcolor: "transparent",
                  color: a.severity === "critical" ? "error.main" : "warning.main",
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  height: 24,
                }}
              />
              <Typography sx={{ fontSize: 16, flex: 1 }}>{a.label}</Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary", fontFamily: '"Roboto Mono", monospace' }}>
                Lane {a.affectedLanes.join(", ")}
              </Typography>
            </Stack>
          ))}
        </Stack>

        {/* Fjärr-affordances som knapp-attrapper */}
        <Stack direction="row" spacing={3} sx={{ alignItems: "center", justifyContent: "center" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              borderRadius: "16px",
              border: 1,
              borderColor: "outline",
              bgcolor: "transparent",
              px: 2.5,
              py: 1.5,
            }}
          >
            <Chip
              label="BACK"
              variant="outlined"
              size="small"
              sx={{
                borderRadius: "8px",
                fontFamily: '"Roboto Mono", monospace',
                fontSize: 12,
                height: 32,
                borderColor: "outline",
              }}
            />
            <Typography sx={{ ...dukTypography.labelMedium, color: "text.secondary" }}>
              Cancel
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              borderRadius: "16px",
              border: 1,
              borderColor: "warning.main",
              bgcolor: "var(--mui-palette-m3-statusWarningContainer)",
              color: "warning.main",
              px: 2.5,
              py: 1.5,
            }}
          >
            <Chip
              label="OK"
              variant="outlined"
              size="small"
              sx={{
                borderRadius: "8px",
                fontFamily: '"Roboto Mono", monospace',
                fontSize: 12,
                height: 32,
                borderColor: "warning.main",
                color: "warning.main",
              }}
            />
            <Typography sx={{ ...dukTypography.labelMedium, color: "warning.main" }}>
              Start anyway
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
