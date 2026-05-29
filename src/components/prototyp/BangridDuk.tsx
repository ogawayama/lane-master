import { useEffect, useMemo, useState } from "react";
import { Box, Card, Chip, Stack, Typography } from "@mui/material";
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  PlayArrow,
} from "@mui/icons-material";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { LaneAssignment, Section } from "@/services/assignmentService";
import {
  aggregateLaneStatus,
  deriveAlerts,
  type ReadinessIndicator,
  type ReadinessStatus,
} from "@/services/readinessService";
import { useLastRemoteEvent } from "@/hooks/useRemoteControl";
import type { ExerciseListItem } from "@/services/sessionService";
import { dukTypography } from "@/theme/tv";

/**
 * BangridDuk — M3 Grid layout-template (redesign 2026-05-28).
 *
 * Canonical M3 TV Grid-pattern: lika-stora cards arrangerade i grid,
 * varje card = en självständig content-unit. Per Android TV-spec.
 *
 * Designprinciper applicerade:
 *  - M3 Filled Card per lane (surfaceContainerLow base, tonal lift)
 *  - State layer overlay för status (statusContainer-tint vid non-ok)
 *  - Lane-nummer-badge: NEUTRAL (vit, inte amber) så status får tala
 *  - Status-bar längst ner per card = enda alltid-synliga status-cue
 *  - Issue-chips bara vid icke-ok (progressive disclosure)
 *  - Top-right alerts = M3 outlined cards med statusContainer-tint
 *  - NEXT-knapp = M3 FilledTonalButton-stil affordance (read-only,
 *    knappen syns men klickas inte — fjärr-OK gör action:en)
 *  - Theme-aware via M3-tokens överallt (funkar i dark + light)
 *  - Responsiv grid: 2-5 col baserat på antal banor + viewport
 */

const STATUS_BAR_COLOR: Record<ReadinessStatus, string> = {
  na: "transparent",
  ok: "var(--mui-palette-success-main)",
  warning: "var(--mui-palette-warning-main)",
  critical: "var(--mui-palette-error-main)",
};

const STATUS_CONTAINER: Record<ReadinessStatus, string> = {
  na: "transparent",
  ok: "transparent", // grön ok = ingen tint, bara baren
  warning: "var(--mui-palette-m3-statusWarningContainer)",
  critical: "var(--mui-palette-m3-errorContainer)",
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
  const someOneCheckedIn = occupiedCount > 0;
  const allReady = someOneCheckedIn && alerts.length === 0;
  const nonReadyCount =
    alerts.length === 0 ? 0 : new Set(alerts.flatMap((a) => a.affectedLanes)).size;

  // Grid columns: 1 på xs, 2 på sm, scale upp baserat på antal banor.
  // M3 Grid säger lika-stora celler — vi väljer antal kolumner så cards
  // får rimlig storlek vid varje breakpoint.
  const cols = (total: number) => ({
    xs: 1,
    sm: 2,
    md: Math.min(total, 3),
    lg: Math.min(total, 4),
    xl: Math.min(total, 5),
  });

  return (
    <Stack
      sx={{
        flex: 1,
        px: { xs: "24px", md: "36px", xl: "48px" },
        py: { xs: "16px", md: "24px", xl: "32px" },
      }}
    >
      {/* Header — exercise context + readiness alerts */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 2, md: 4 }}
        sx={{
          alignItems: { xs: "flex-start", md: "flex-start" },
          justifyContent: "space-between",
          mb: { xs: 3, md: 4 },
        }}
      >
        <Stack sx={{ flex: 1, minWidth: 0 }} spacing={1}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "baseline" }}>
            <Typography
              sx={{
                ...dukTypography.labelLarge,
                letterSpacing: "0.3em",
                color: "text.secondary",
              }}
            >
              Check-in · {section.replace("_", " ").toUpperCase()}
            </Typography>
            {totalCount > 0 && (
              <Typography
                sx={{
                  ...dukTypography.labelMono,
                  color: "text.secondary",
                }}
              >
                {occupiedCount} / {totalCount}
              </Typography>
            )}
          </Stack>
          {exercise ? (
            <>
              <Typography
                sx={{
                  ...dukTypography.displayMedium,
                  color: "text.primary",
                }}
              >
                {exercise.title}
              </Typography>
              <Typography
                sx={{
                  ...dukTypography.bodyLarge,
                  color: "text.secondary",
                  maxWidth: 720,
                }}
              >
                Trainees check in · weapons warm up · review status before start
              </Typography>
            </>
          ) : (
            <Typography
              sx={{
                ...dukTypography.displayMedium,
                color: "text.primary",
              }}
            >
              Waiting for check-in
            </Typography>
          )}
        </Stack>

        {/* Alerts area — M3 outlined cards med statusContainer-tint */}
        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          sx={{
            flexWrap: "wrap",
            justifyContent: { xs: "flex-start", md: "flex-end" },
            maxWidth: { xs: "100%", md: "50%" },
          }}
        >
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
                    px: { xs: 1.5, md: 2.5 },
                    py: { xs: 1, md: 1.5 },
                    bgcolor:
                      a.severity === "critical"
                        ? "var(--mui-palette-m3-errorContainer)"
                        : "var(--mui-palette-m3-statusWarningContainer)",
                    color: "text.primary",
                    maxWidth: 280,
                    display: "flex",
                    gap: 1.5,
                    alignItems: "flex-start",
                    boxShadow: "none",
                  }}
                >
                  {a.severity === "critical" ? (
                    <ErrorIcon sx={{ color: "error.main", fontSize: { xs: 18, md: 22 }, mt: "2px" }} />
                  ) : (
                    <WarningIcon sx={{ color: "warning.main", fontSize: { xs: 18, md: 22 }, mt: "2px" }} />
                  )}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ ...dukTypography.titleMedium, fontWeight: 600 }}>
                      {a.label}
                    </Typography>
                    <Typography
                      sx={{
                        ...dukTypography.labelMono,
                        color: "text.secondary",
                        mt: 0.25,
                      }}
                    >
                      Lane {a.affectedLanes.join(", Lane ")}
                    </Typography>
                  </Box>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </Stack>
      </Stack>

      {/* M3 Grid — lika-stora lane-cards */}
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box
          sx={{
            display: "grid",
            gap: { xs: 2, md: 2.5, xl: 3 },
            gridTemplateColumns: {
              xs: `repeat(${cols(totalCount).xs}, minmax(0, 1fr))`,
              sm: `repeat(${cols(totalCount).sm}, minmax(0, 1fr))`,
              md: `repeat(${cols(totalCount).md}, minmax(0, 1fr))`,
              lg: `repeat(${cols(totalCount).lg}, minmax(0, 1fr))`,
              xl: `repeat(${cols(totalCount).xl}, minmax(0, 1fr))`,
            },
            width: "100%",
            maxWidth: 1600,
          }}
        >
          {lanes.length === 0 && (
            <Typography
              sx={{
                gridColumn: "1 / -1",
                textAlign: "center",
                color: "text.disabled",
                fontSize: { xs: 14, md: 18 },
              }}
            >
              No lanes configured for this section yet.
            </Typography>
          )}
          {lanes.map((lane) => (
            <LaneTile key={lane.id} lane={lane} />
          ))}
        </Box>
      </Box>

      {/* Bottom action row */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 2, sm: 0 }}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          mt: { xs: 3, md: 4 },
        }}
      >
        <Typography
          sx={{
            ...dukTypography.bodyMedium,
            color: "text.secondary",
            order: { xs: 2, sm: 1 },
          }}
        >
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
  const prefersReducedMotion = useReducedMotion();
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
  const hasIssues = issues.length > 0;

  return (
    <Stack sx={{ alignItems: "center" }}>
      {/* Lane number badge — neutral (vit over textPrimary inverted),
          inte status-färgad. Identitet, inte status. */}
      <Box
        sx={{
          width: { xs: 44, md: 52, xl: 56 },
          height: { xs: 44, md: 52, xl: 56 },
          borderRadius: "16px",
          bgcolor: "text.primary",
          color: "background.default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: { xs: 20, md: 26, xl: 28 },
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          boxShadow: 3,
          mb: -1.5,
          zIndex: 10,
        }}
      >
        {lane.lane_number}
      </Box>

      {/* M3 Filled Card — surfaceContainerLow base, status-tinted vid non-ok */}
      <Card
        component={motion.div}
        layout
        animate={
          prefersReducedMotion ? undefined : { scale: hasIssues ? 1.0 : 1.0 }
        }
        sx={{
          width: "100%",
          minHeight: { xs: 200, md: 240, xl: 280 },
          bgcolor: hasIssues
            ? STATUS_CONTAINER[readiness]
            : "var(--mui-palette-m3-surfaceContainerLow)",
          pt: { xs: 3, md: 4 },
          px: { xs: 1.5, md: 2.5 },
          pb: { xs: 1.5, md: 2.5 },
          display: "flex",
          flexDirection: "column",
          boxShadow: "none",
          transition: "background-color 240ms cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        <Stack sx={{ alignItems: "center", textAlign: "center", flex: 1 }} spacing={0.5}>
          <Typography
            sx={{
              ...dukTypography.headlineSmall,
              fontWeight: 500,
              color: occupied ? "text.primary" : "text.disabled",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            {occupied ? lane.name : "—"}
          </Typography>
          <Typography sx={{ ...dukTypography.labelMedium, color: "text.secondary" }}>
            {occupied ? "Rank" : "Empty"}
          </Typography>

          {/* Status bar — den enda alltid-synliga status-cue:n */}
          <Box
            sx={{
              mt: { xs: 2, md: 2.5 },
              height: 6,
              width: "100%",
              borderRadius: "999px",
              bgcolor:
                readiness === "na"
                  ? "var(--mui-palette-divider)"
                  : STATUS_BAR_COLOR[readiness],
              transition: "background-color 500ms",
            }}
          />

          {/* Weapon row — alltid synlig vid occupied */}
          <Box sx={{ width: "100%", pt: { xs: 2, md: 2.5 }, mt: "auto" }}>
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
                  bgcolor: "transparent",
                  px: 1.5,
                  py: 1,
                  fontSize: 11,
                  color: "text.disabled",
                  textAlign: "left",
                }}
              >
                Waiting for assignment
              </Box>
            )}
          </Box>

          {/* Issue chips — progressive disclosure, bara vid non-ok */}
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
                          <ErrorIcon sx={{ fontSize: "14px !important" }} />
                        ) : (
                          <WarningIcon sx={{ fontSize: "14px !important" }} />
                        )
                      }
                      label={ISSUE_LABEL[issue.indicator][issue.severity]}
                      size="small"
                      sx={{
                        width: "100%",
                        height: 26,
                        borderRadius: "8px",
                        fontSize: 11,
                        fontWeight: 500,
                        bgcolor: "transparent",
                        border: 1,
                        borderColor:
                          issue.severity === "critical" ? "error.main" : "warning.main",
                        color:
                          issue.severity === "critical" ? "error.main" : "warning.main",
                        "& .MuiChip-icon": { color: "inherit", ml: 0.5 },
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
        bgcolor: "transparent",
        px: 1.5,
        py: 1,
        textAlign: "left",
      }}
    >
      <Icon sx={{ color: iconColor, fontSize: 20, flexShrink: 0 }} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            ...dukTypography.titleMedium,
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
              ...dukTypography.bodyMedium,
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
 * NEXT-knapp som M3 FilledTonalButton-stil affordance.
 * Inte klickbar (duken har inga mus-element). Pulse på fjärr-OK.
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
    ? {
        bg: "var(--mui-palette-m3-surfaceContainerLow)",
        fg: "text.disabled",
        border: "divider",
      }
    : allReady
      ? {
          bg: "var(--mui-palette-m3-statusSuccessContainer)",
          fg: "success.main",
          border: "success.main",
        }
      : {
          bg: "var(--mui-palette-m3-statusWarningContainer)",
          fg: "warning.main",
          border: "warning.main",
        };

  return (
    <Box
      aria-hidden
      sx={{
        order: { xs: 1, sm: 2 },
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        borderRadius: "20px",
        border: 1,
        borderColor: tone.border,
        bgcolor: tone.bg,
        px: { xs: 2.5, md: 3.5 },
        py: { xs: 1.5, md: 2 },
        userSelect: "none",
        alignSelf: { xs: "flex-end", sm: "auto" },
        transition: "all 200ms",
        transform: flash ? "scale(1.03)" : "scale(1)",
        filter: flash ? "brightness(1.2)" : "none",
        color: tone.fg,
      }}
    >
      <PlayArrow sx={{ fontSize: { xs: 20, md: 24 } }} />
      <Stack sx={{ alignItems: "flex-start" }}>
        <Typography sx={{ fontSize: { xs: 14, md: 18 }, fontWeight: 500, color: tone.fg }}>
          Next
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: 9, md: 10 },
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: tone.fg,
            opacity: 0.7,
          }}
        >
          Press OK on remote
        </Typography>
      </Stack>
    </Box>
  );
}
