import { useEffect, useMemo, useState } from "react";
import { Box, Card, Chip, Stack, Typography } from "@mui/material";
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  ChevronRight,
  PlayArrow,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import type { LaneAssignment, Section } from "@/services/assignmentService";
import {
  aggregateLaneStatus,
  deriveAlerts,
  type ReadinessIndicator,
  type ReadinessStatus,
} from "@/services/readinessService";
import { useLastRemoteEvent } from "@/hooks/useRemoteControl";
import type { ExerciseListItem } from "@/services/sessionService";
import { dukTypography, tvSafeInset } from "@/theme/tv";

/**
 * Helhetsprototyp — BangridDuk (M3-omskrivning 2026-05-28).
 *
 * Duken under check-in-fasen. M3-stil med:
 *   • Lane-cards via MUI Card med tonal surface
 *   • Lane-number badge i M3 neutral (vit över black, inte amber)
 *   • Status-bar längst ner per kort, M3 statusToken-färger
 *   • Issue-chips som M3 outlined Chips med Error/Warning ikoner
 *   • Top-right alerts som filled M3 Cards med statusContainer-tint
 *   • NEXT-knapp som M3 FilledTonalButton-stil (read-only affordance)
 */

const STATUS_COLOR: Record<ReadinessStatus, string> = {
  na: "transparent",
  ok: "var(--mui-palette-success-main)",
  warning: "var(--mui-palette-warning-main)",
  critical: "var(--mui-palette-error-main)",
};

const ISSUE_LABEL: Record<
  ReadinessIndicator,
  { warning: string; critical: string }
> = {
  weapon: { warning: "Weapon issue", critical: "Weapon offline" },
  battery: { warning: "Battery low", critical: "Battery critical" },
  ammo: { warning: "Ammo low", critical: "Ammo critical" },
  comms: { warning: "Wifi unstable", critical: "Wifi offline" },
};

const INDICATOR_ORDER: ReadinessIndicator[] = ["weapon", "battery", "ammo", "comms"];

interface LaneIssue {
  indicator: ReadinessIndicator;
  severity: "warning" | "critical";
}

function allIssues(lane: LaneAssignment): LaneIssue[] {
  const issues: LaneIssue[] = [];
  for (const sev of ["critical", "warning"] as const) {
    for (const ind of INDICATOR_ORDER) {
      const status = (lane[`${ind}_status` as const] ?? "na") as ReadinessStatus;
      if (status === sev) issues.push({ indicator: ind, severity: sev });
    }
  }
  return issues;
}

export function BangridDuk({
  section,
  exercise,
  lanes,
}: {
  section: Section;
  exercise: ExerciseListItem | null;
  lanes: LaneAssignment[];
}) {
  const alerts = useMemo(() => {
    const occupied = lanes
      .filter((l) => l.status === "occupied")
      .map((l) => ({
        lane_number: l.lane_number,
        weapon_status: (l.weapon_status ?? "na") as ReadinessStatus,
        battery_status: (l.battery_status ?? "na") as ReadinessStatus,
        ammo_status: (l.ammo_status ?? "na") as ReadinessStatus,
        comms_status: (l.comms_status ?? "na") as ReadinessStatus,
      }));
    return deriveAlerts(occupied);
  }, [lanes]);

  const occupiedCount = lanes.filter((l) => l.status === "occupied").length;
  const totalCount = lanes.length;
  const cols = totalCount <= 5 ? Math.max(totalCount, 1) : Math.ceil(totalCount / 2);

  const someOneCheckedIn = occupiedCount > 0;
  const allReady = someOneCheckedIn && alerts.length === 0;
  const nonReadyCount =
    alerts.length === 0 ? 0 : new Set(alerts.flatMap((a) => a.affectedLanes)).size;

  return (
    <Stack sx={{ ...tvSafeInset, flex: 1 }}>
      {/* Header — exercise context (left) + system alerts (right) */}
      <Stack
        direction="row"
        spacing={4}
        sx={{ alignItems: "flex-start", justifyContent: "space-between", mb: 5 }}
      >
        <Stack sx={{ flex: 1, minWidth: 0 }} spacing={1.5}>
          <Stack direction="row" spacing={2}>
            <Typography sx={{ ...dukTypography.labelMedium, color: "text.secondary" }}>
              Check-in · {section.replace("_", " ").toUpperCase()}
            </Typography>
            {totalCount > 0 && (
              <Typography
                sx={{
                  ...dukTypography.labelMedium,
                  fontFamily: '"Roboto Mono", monospace',
                  color: "text.secondary",
                }}
              >
                {occupiedCount} / {totalCount}
              </Typography>
            )}
          </Stack>
          {exercise ? (
            <>
              <Typography sx={{ ...dukTypography.displayMedium, color: "text.primary" }}>
                {exercise.title}
              </Typography>
              <Typography sx={{ ...dukTypography.bodyLarge, color: "text.secondary", maxWidth: 720 }}>
                Trainees check in · weapons warm up · review status before start
              </Typography>
            </>
          ) : (
            <Typography sx={{ ...dukTypography.displayMedium, color: "text.primary" }}>
              Waiting for check-in
            </Typography>
          )}
        </Stack>

        {/* Top-right alerts — M3 filled cards with statusContainer-tint */}
        <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "55%" }} useFlexGap>
          <AnimatePresence>
            {alerts.map((a) => (
              <motion.div
                key={`${a.indicator}-${a.severity}`}
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    bgcolor:
                      a.severity === "critical"
                        ? "var(--mui-palette-m3-errorContainer)"
                        : "var(--mui-palette-m3-statusWarningContainer)",
                    color:
                      a.severity === "critical"
                        ? "var(--mui-palette-m3-onErrorContainer)"
                        : "var(--mui-palette-text-primary)",
                    maxWidth: 280,
                    display: "flex",
                    gap: 1.5,
                    alignItems: "flex-start",
                  }}
                >
                  {a.severity === "critical" ? (
                    <ErrorIcon sx={{ color: "error.main", fontSize: 24, mt: "2px" }} />
                  ) : (
                    <WarningIcon sx={{ color: "warning.main", fontSize: 24, mt: "2px" }} />
                  )}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{a.label}</Typography>
                    <Typography sx={{ fontSize: 11, opacity: 0.7, mt: 0.25 }}>
                      Lane {a.affectedLanes.join(", Lane ")}
                    </Typography>
                  </Box>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </Stack>
      </Stack>

      {/* Lane grid */}
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            width: "100%",
            maxWidth: 1600,
          }}
        >
          {lanes.length === 0 && (
            <Typography sx={{ ...dukTypography.bodyLarge, gridColumn: "1 / -1", textAlign: "center", color: "text.secondary" }}>
              No lanes configured for this section yet.
            </Typography>
          )}
          {lanes.map((lane) => (
            <LaneTile key={lane.id} lane={lane} />
          ))}
        </Box>
      </Box>

      {/* Bottom action row */}
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mt: 4, px: 1 }}>
        <Typography sx={{ ...dukTypography.bodyMedium, color: "text.secondary" }}>
          {!someOneCheckedIn
            ? "Tap your RFID on the check-in tablet to take a lane."
            : !allReady
              ? `${nonReadyCount} lane${nonReadyCount === 1 ? "" : "s"} not ready — review before starting.`
              : "All ready."}
        </Typography>
        <NextButton enabled={someOneCheckedIn} allReady={allReady} />
      </Stack>
    </Stack>
  );
}

function LaneTile({ lane }: { lane: LaneAssignment }) {
  const occupied = lane.status === "occupied";
  const readiness: ReadinessStatus = occupied
    ? aggregateLaneStatus({
        weapon_status: (lane.weapon_status ?? "ok") as ReadinessStatus,
        battery_status: (lane.battery_status ?? "ok") as ReadinessStatus,
        ammo_status: (lane.ammo_status ?? "ok") as ReadinessStatus,
        comms_status: (lane.comms_status ?? "ok") as ReadinessStatus,
      })
    : "na";

  const issues = occupied ? allIssues(lane) : [];

  return (
    <Stack sx={{ alignItems: "center" }}>
      {/* Lane number badge — neutral white-on-black (identity, not status) */}
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: "16px",
          bgcolor: "common.white",
          color: "common.black",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...dukTypography.headlineSmall,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          boxShadow: 4,
          mb: -1.5,
          zIndex: 10,
        }}
      >
        {lane.lane_number}
      </Box>

      {/* Lane card */}
      <Card
        component={motion.div}
        layout
        sx={{
          width: "100%",
          minHeight: 280,
          bgcolor: "var(--mui-palette-m3-surfaceContainerLow)",
          pt: 4,
          px: 2.5,
          pb: 2.5,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack sx={{ alignItems: "center", textAlign: "center", flex: 1 }} spacing={0.5}>
          <Typography
            sx={{
              ...dukTypography.titleMedium,
              color: occupied ? "text.primary" : "text.disabled",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            {occupied ? lane.name : "—"}
          </Typography>
          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
            {occupied ? "Rank" : "Empty"}
          </Typography>

          {/* Status bar */}
          <Box
            sx={{
              mt: 2.5,
              height: 6,
              width: "100%",
              borderRadius: "999px",
              bgcolor: STATUS_COLOR[readiness] === "transparent" ? "rgba(255,255,255,0.1)" : STATUS_COLOR[readiness],
              transition: "background-color 500ms",
            }}
          />

          {/* Weapon row */}
          <Box sx={{ width: "100%", pt: 2.5, mt: "auto" }}>
            {occupied ? (
              <WeaponRow
                weaponName={lane.weapon_name ?? "—"}
                weaponType={lane.weapon_type ?? ""}
                weaponStatus={(lane.weapon_status ?? "na") as ReadinessStatus}
              />
            ) : (
              <Box
                sx={{
                  borderRadius: 1.5,
                  border: 1,
                  borderColor: "divider",
                  bgcolor: "var(--mui-palette-m3-surfaceContainer)",
                  px: 1.5,
                  py: 1,
                  fontSize: 11,
                  color: "text.disabled",
                }}
              >
                Waiting for assignment
              </Box>
            )}
          </Box>

          {/* Issue chips */}
          {issues.length > 0 && (
            <Stack sx={{ mt: 1, width: "100%" }} spacing={0.75}>
              <AnimatePresence>
                {issues.map((issue) => (
                  <motion.div
                    key={`${issue.indicator}-${issue.severity}`}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Chip
                      icon={
                        issue.severity === "critical" ? (
                          <ErrorIcon sx={{ fontSize: "16px !important" }} />
                        ) : (
                          <WarningIcon sx={{ fontSize: "16px !important" }} />
                        )
                      }
                      label={ISSUE_LABEL[issue.indicator][issue.severity]}
                      size="small"
                      sx={{
                        width: "100%",
                        height: 28,
                        borderRadius: "8px",
                        fontSize: 11,
                        fontWeight: 500,
                        bgcolor:
                          issue.severity === "critical"
                            ? "var(--mui-palette-m3-errorContainer)"
                            : "var(--mui-palette-m3-statusWarningContainer)",
                        color:
                          issue.severity === "critical"
                            ? "var(--mui-palette-error-main)"
                            : "var(--mui-palette-warning-main)",
                        "& .MuiChip-icon": {
                          color: "inherit",
                          ml: 0.5,
                        },
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </Stack>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

function WeaponRow({
  weaponName,
  weaponType,
  weaponStatus,
}: {
  weaponName: string;
  weaponType: string;
  weaponStatus: ReadinessStatus;
}) {
  const Icon =
    weaponStatus === "critical"
      ? ErrorIcon
      : weaponStatus === "warning"
        ? WarningIcon
        : CheckIcon;
  const iconColor =
    weaponStatus === "critical"
      ? "error.main"
      : weaponStatus === "warning"
        ? "warning.main"
        : weaponStatus === "ok"
          ? "success.main"
          : "text.disabled";

  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        alignItems: "center",
        borderRadius: 1.5,
        border: 1,
        borderColor: "divider",
        bgcolor: "var(--mui-palette-m3-surfaceContainer)",
        px: 1.5,
        py: 1,
        textAlign: "left",
      }}
    >
      <Icon sx={{ color: iconColor, fontSize: 20, flexShrink: 0 }} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {weaponName}
        </Typography>
        {weaponType && (
          <Typography
            sx={{
              fontSize: 10,
              color: "text.secondary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {weaponType}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

/**
 * NEXT-knapp som affordans för fjärr-OK. Visuell M3 FilledTonalButton-stil
 * men INTE klickbar (duken har inga mus-element). Pulse på fjärr-OK.
 */
function NextButton({ enabled, allReady }: { enabled: boolean; allReady: boolean }) {
  const last = useLastRemoteEvent();
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (last?.event !== "ok" || !enabled) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 400);
    return () => clearTimeout(t);
  }, [last, enabled]);

  const tone = !enabled
    ? { bg: "var(--mui-palette-m3-surfaceContainerLow)", fg: "text.disabled", border: "transparent" }
    : allReady
      ? {
          bg: "var(--mui-palette-m3-statusSuccessContainer)",
          fg: "var(--mui-palette-success-main)",
          border: "var(--mui-palette-success-main)",
        }
      : {
          bg: "var(--mui-palette-m3-statusWarningContainer)",
          fg: "var(--mui-palette-warning-main)",
          border: "var(--mui-palette-warning-main)",
        };

  return (
    <Box
      aria-hidden
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        borderRadius: "16px",
        border: 1,
        borderColor: tone.border,
        bgcolor: tone.bg,
        px: 3,
        py: 1.5,
        userSelect: "none",
        transition: "all 200ms",
        transform: flash ? "scale(1.03)" : "scale(1)",
        filter: flash ? "brightness(1.25)" : "none",
        color: tone.fg,
      }}
    >
      <PlayArrow sx={{ fontSize: 24 }} />
      <Stack sx={{ alignItems: "flex-start" }}>
        <Typography sx={{ ...dukTypography.titleLarge, color: tone.fg }}>Next</Typography>
        <Typography sx={{ ...dukTypography.labelMedium, color: tone.fg, opacity: 0.7 }}>
          Press OK on remote
        </Typography>
      </Stack>
      <ChevronRight sx={{ fontSize: 18, opacity: 0.6, ml: 0.5 }} />
    </Box>
  );
}
