import { useEffect, useState } from "react";
import { Box, Card, Stack, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import {
  fetchAllLanes,
  type LaneAssignment,
  type Section as LaneSection,
} from "@/services/assignmentService";
import { subscribeLaneAssignments, unsubscribe } from "@/services/realtimeService";
import {
  aggregateLaneStatus,
  type ReadinessStatus,
} from "@/services/readinessService";

/**
 * Helhetsprototyp — MiniBangridTablet (M3-omskrivning 2026-05-28).
 * Read-only mirror på tabletten under check-in. M3-tokens + Cards.
 */

const STATUS_BG: Record<ReadinessStatus, string> = {
  na: "var(--mui-palette-m3-surfaceContainerLow)",
  ok: "var(--mui-palette-m3-statusSuccessContainer)",
  warning: "var(--mui-palette-m3-statusWarningContainer)",
  critical: "var(--mui-palette-m3-statusAttentionContainer)",
};
const STATUS_FG: Record<ReadinessStatus, string> = {
  na: "var(--mui-palette-divider)",
  ok: "var(--mui-palette-success-main)",
  warning: "var(--mui-palette-warning-main)",
  critical: "var(--mui-palette-error-main)",
};

export function MiniBangridTablet({ section }: { section: LaneSection }) {
  const [lanes, setLanes] = useState<LaneAssignment[]>([]);
  useEffect(() => {
    void fetchAllLanes(section).then(setLanes);
    const channel = subscribeLaneAssignments(section, setLanes);
    return () => unsubscribe(channel);
  }, [section]);

  const occupied = lanes.filter((l) => l.status === "occupied").length;
  const total = lanes.length;

  return (
    <Card sx={{ p: 2, bgcolor: "var(--mui-palette-m3-surfaceContainerLow)" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline", mb: 1.5 }}>
        <Typography sx={{ fontSize: 10, letterSpacing: "0.3em", color: "text.secondary", textTransform: "uppercase" }}>
          On the projector now · Check-in
        </Typography>
        <Typography sx={{ fontSize: 14, fontFamily: '"Roboto Mono", monospace', fontVariantNumeric: "tabular-nums" }}>
          {occupied} / {total}
        </Typography>
      </Stack>

      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: `repeat(${Math.min(total, 5)}, minmax(0, 1fr))` }}>
        <AnimatePresence>
          {lanes.map((lane) => {
            const readiness: ReadinessStatus =
              lane.status === "occupied"
                ? aggregateLaneStatus({
                    weapon_status: (lane.weapon_status ?? "ok") as ReadinessStatus,
                    battery_status: (lane.battery_status ?? "ok") as ReadinessStatus,
                    ammo_status: (lane.ammo_status ?? "ok") as ReadinessStatus,
                    comms_status: (lane.comms_status ?? "ok") as ReadinessStatus,
                  })
                : "na";
            const occupiedHere = lane.status === "occupied";
            return (
              <motion.div
                key={lane.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  sx={{
                    bgcolor: STATUS_BG[readiness],
                    outline: readiness !== "na" ? "1.5px solid" : "1px solid",
                    outlineColor: readiness !== "na" ? STATUS_FG[readiness] : "var(--mui-palette-divider)",
                    outlineOffset: "-1px",
                    px: 1.25,
                    py: 1.5,
                    position: "relative",
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Typography sx={{ fontSize: 10, fontFamily: '"Roboto Mono", monospace', color: "text.secondary" }}>
                      L{lane.lane_number}
                    </Typography>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: STATUS_FG[readiness] }} />
                  </Stack>
                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 12,
                      fontWeight: 500,
                      color: occupiedHere ? "text.primary" : "text.disabled",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {occupiedHere ? lane.name : "—"}
                  </Typography>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </Box>

      <Typography sx={{ mt: 1.5, fontSize: 10, color: "text.secondary", textAlign: "center" }}>
        Mirrors the duk · drive with the remote
      </Typography>
    </Card>
  );
}
