import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { Warning as WarningIcon } from "@mui/icons-material";
import type { DerivedAlert } from "@/services/readinessService";

/**
 * StartConfirmOverlay — M3 Basic Dialog (redesign 2026-05-28).
 *
 * Canonical M3 Dialog-pattern:
 *  - DialogTitle med icon + heading
 *  - DialogContent med list (alerts)
 *  - DialogActions med text + filled-tonal buttons (M3 standard layout)
 *  - 28px corner radius (M3 Dialog-spec)
 *  - Action-affordances som M3 button-attrapper för fjärr-OK/Back
 *  - Theme-aware via M3-tokens (funkar i båda lägen)
 *  - Responsiv typografi
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
            maxWidth: { xs: 600, md: 760, xl: 920 },
            mx: { xs: 2, md: 4 },
            bgcolor: "var(--mui-palette-m3-surfaceContainerHigh)",
            color: "text.primary",
            borderRadius: "28px",
            boxShadow: 8,
          },
        },
        backdrop: {
          sx: {
            bgcolor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
          },
        },
      }}
    >
      <DialogTitle sx={{ p: { xs: 3, md: 4 }, pb: 1 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 1.5 }}>
          <WarningIcon sx={{ color: "warning.main", fontSize: { xs: 24, md: 32 } }} />
          <Typography
            sx={{
              fontSize: { xs: 10, md: 12 },
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: "warning.main",
            }}
          >
            Confirmation
          </Typography>
        </Stack>
        <Typography
          sx={{
            fontSize: { xs: 22, md: 28, xl: 36 },
            fontWeight: 400,
            lineHeight: 1.15,
            color: "text.primary",
          }}
        >
          Start with {laneCount - readyCount} lane{laneCount - readyCount === 1 ? "" : "s"} not ready?
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 3, md: 4 }, py: { xs: 2, md: 3 } }}>
        <Stack spacing={1.25}>
          {alerts.map((a) => (
            <Stack
              key={`${a.indicator}-${a.severity}`}
              direction="row"
              spacing={2}
              sx={{
                alignItems: "center",
                borderRadius: 2,
                bgcolor:
                  a.severity === "critical"
                    ? "var(--mui-palette-m3-errorContainer)"
                    : "var(--mui-palette-m3-statusWarningContainer)",
                px: { xs: 1.5, md: 2.5 },
                py: { xs: 1.25, md: 1.75 },
              }}
            >
              <Chip
                label={a.severity}
                size="small"
                sx={{
                  bgcolor: "transparent",
                  color: a.severity === "critical" ? "error.main" : "warning.main",
                  fontSize: 10,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  height: 24,
                  px: 0,
                }}
              />
              <Typography sx={{ fontSize: { xs: 13, md: 16 }, flex: 1, color: "text.primary" }}>
                {a.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: 11, md: 12 },
                  color: "text.secondary",
                  fontFamily: '"Roboto Mono", monospace',
                  flexShrink: 0,
                }}
              >
                Lane {a.affectedLanes.join(", ")}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </DialogContent>

      {/* M3 DialogActions — text-button vänster, filled-tonal höger */}
      <DialogActions sx={{ p: { xs: 3, md: 4 }, pt: { xs: 2, md: 2.5 } }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ width: "100%", justifyContent: "flex-end", alignItems: "center" }}
        >
          {/* Back-affordance (M3 Text Button-stil) */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: { xs: 2, md: 3 },
              py: 1.25,
              borderRadius: "9999px",
            }}
          >
            <Chip
              label="BACK"
              size="small"
              sx={{
                borderRadius: "8px",
                fontFamily: '"Roboto Mono", monospace',
                fontSize: { xs: 10, md: 12 },
                height: { xs: 24, md: 28 },
                bgcolor: "transparent",
                border: 1,
                borderColor: "outline",
                color: "text.secondary",
              }}
            />
            <Typography
              sx={{
                fontSize: { xs: 12, md: 14 },
                fontWeight: 500,
                color: "text.primary",
              }}
            >
              Cancel
            </Typography>
          </Box>

          {/* OK-affordance (M3 Filled Tonal Button-stil) */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: { xs: 2.5, md: 3.5 },
              py: 1.25,
              borderRadius: "9999px",
              bgcolor: "var(--mui-palette-m3-statusWarningContainer)",
              color: "warning.main",
            }}
          >
            <Chip
              label="OK"
              size="small"
              sx={{
                borderRadius: "8px",
                fontFamily: '"Roboto Mono", monospace',
                fontSize: { xs: 10, md: 12 },
                height: { xs: 24, md: 28 },
                bgcolor: "transparent",
                border: 1,
                borderColor: "warning.main",
                color: "warning.main",
              }}
            />
            <Typography
              sx={{
                fontSize: { xs: 12, md: 14 },
                fontWeight: 500,
                color: "warning.main",
              }}
            >
              Start anyway
            </Typography>
          </Box>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
