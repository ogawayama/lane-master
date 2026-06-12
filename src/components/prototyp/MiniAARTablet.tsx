import { useEffect, useMemo, useState } from "react";
import { Box, Card, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  computeResult,
  sortByPriority,
  type AARResult,
  type Status,
} from "@/services/aarResults";
import type { ExerciseListItem, Section } from "@/services/sessionService";

/**
 * Helhetsprototyp — MiniAARTablet (M3-omskrivning 2026-05-28).
 * Read-only mirror på tabletten under aar. M3-tokens.
 */

interface LaneInfo {
  lane_number: number;
  name: string | null;
  weapon_name: string | null;
  status: string;
}

const STATUS_BG: Record<Status, string> = {
  red: "var(--mui-palette-m3-statusAttentionContainer)",
  yellow: "var(--mui-palette-m3-statusWarningContainer)",
  green: "var(--mui-palette-m3-statusSuccessContainer)",
};
const STATUS_FG: Record<Status, string> = {
  red: "var(--mui-palette-error-main)",
  yellow: "var(--mui-palette-warning-main)",
  green: "var(--mui-palette-success-main)",
};

export function MiniAARTablet({
  exercise,
  section,
}: {
  exercise: ExerciseListItem | null;
  section: Section;
}) {
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

  if (!exercise) {
    return (
      <Card sx={{ p: 4, textAlign: "center", color: "text.secondary", bgcolor: "var(--mui-palette-m3-surfaceContainerLow)" }}>
        No exercise to review.
      </Card>
    );
  }
  if (results.length === 0) {
    return (
      <Card sx={{ p: 4, textAlign: "center", color: "text.secondary", bgcolor: "var(--mui-palette-m3-surfaceContainerLow)" }}>
        No trainees on the lanes.
      </Card>
    );
  }

  const reds = results.filter((r) => r.reds.length > 0).length;
  const yellows = results.filter((r) => r.yellows.length > 0 && r.reds.length === 0).length;

  return (
    <Card sx={{ p: 2, bgcolor: "var(--mui-palette-m3-surfaceContainerLow)" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline", mb: 1.5 }}>
        <Typography sx={{ fontSize: 10, letterSpacing: "0.3em", color: "text.secondary", textTransform: "uppercase" }}>
          On the projector now · AAR
        </Typography>
        <Stack direction="row" spacing={2} sx={{ fontSize: 12, color: "text.secondary" }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: STATUS_FG.red }} />
            <span>{reds}</span>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: STATUS_FG.yellow }} />
            <span>{yellows}</span>
          </Stack>
        </Stack>
      </Stack>

      <Stack spacing={1}>
        {results.map((r) => {
          const worst: Status =
            r.reds.length > 0 ? "red" : r.yellows.length > 0 ? "yellow" : "green";
          return (
            <motion.div
              key={r.lane}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Box
                sx={{
                  borderRadius: 1.5,
                  border: 1,
                  borderColor: STATUS_FG[worst],
                  bgcolor: STATUS_BG[worst],
                  px: 1.5,
                  py: 1,
                }}
              >
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", minWidth: 0 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: STATUS_FG[worst], flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 10, fontFamily: '"Roboto Mono", monospace', opacity: 0.6, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                      L{r.lane}
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.trainee ?? "—"}
                    </Typography>
                  </Stack>
                  {/* Synliga mikro-etiketter — title-tooltips finns inte
                      på iPad, och en naken siffra säger inget. */}
                  <Stack direction="row" spacing={1.5} sx={{ fontSize: 12, fontFamily: '"Roboto Mono", monospace', opacity: 0.85, flexShrink: 0 }}>
                    <span><MetricLabel>Hit</MetricLabel> {r.hits}</span>
                    <span><MetricLabel>Time</MetricLabel> {r.time_seconds}s</span>
                    <span><MetricLabel>Spread</MetricLabel> {r.spread_cm}cm</span>
                  </Stack>
                </Stack>
              </Box>
            </motion.div>
          );
        })}
      </Stack>

      <Typography sx={{ mt: 1.5, fontSize: 10, color: "text.secondary", textAlign: "center" }}>
        Mirrors the projector · ◀ ▶ moves focus · hold OK for next exercise
      </Typography>
    </Card>
  );
}

function MetricLabel({ children }: { children: string }) {
  return (
    <Box component="span" sx={{ opacity: 0.55, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", mr: 0.25 }}>
      {children}
    </Box>
  );
}
