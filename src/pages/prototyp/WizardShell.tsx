import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  Container,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useSession } from "@/hooks/useSession";
import {
  createIdleSession,
  resetSession,
  setExerciseList,
  setPhase,
  type Section,
} from "@/services/sessionService";
import { pressRemote } from "@/hooks/useRemoteControl";
import { supabase } from "@/integrations/supabase/client";
import {
  setSignal,
  clearSignal,
  clearAllSignals,
  type DarStatus,
} from "@/services/darService";
import { useDARSignals } from "@/hooks/useDARSignals";
import {
  setLaneIndicator,
  resetLaneToOk,
  type ReadinessIndicator,
  type ReadinessStatus,
} from "@/services/readinessService";
import {
  fetchAllLanes,
  type LaneAssignment,
  type Section as LaneSection,
} from "@/services/assignmentService";
import { subscribeLaneAssignments, unsubscribe } from "@/services/realtimeService";

/**
 * Helhetsprototyp — WizardShell (M3-omskrivning 2026-05-28).
 *
 * Facilitator backstage-panel. M3 Cards för sektioner, MUI Buttons,
 * ToggleButtonGroup för DAR/readiness-väljare (M3 segmented button-
 * stil). Större touch-targets (h: 48px) per UX-review.
 */

const DEMO_EXERCISES = [
  {
    id: "ex-1",
    title: "Basic accuracy — 5 shots, paper target",
    weapon: "Glock 17",
    hits_threshold: 4,
    time_seconds: 60,
    spread_threshold: 15,
  },
  {
    id: "ex-2",
    title: "Speed engagement — 3D targets",
    weapon: "AR15",
    hits_threshold: 6,
    time_seconds: 45,
    spread_threshold: 20,
  },
  {
    id: "ex-3",
    title: "CG M4 — HEAT 551, single target",
    weapon: "CG M4",
    hits_threshold: 1,
    time_seconds: 90,
    spread_threshold: 30,
  },
];

export default function WizardShell() {
  const [searchParams] = useSearchParams();
  const section = (searchParams.get("section") ?? "idt") as Section;
  const { session, loading } = useSession(section);
  const { byLane } = useDARSignals(session?.id);

  // Brand-medveten styling. Under Saab (?brand=saab) blir WoZ-zonerna NEUTRALT
  // grå med färgad overline som identitet (per design/saab-branding.md
  // "Application notes" #4); teal-M3 behåller sina tonade container-zoner.
  const theme = useTheme();
  const isSaab = (theme.palette as { m3?: { brand?: string } }).m3?.brand === "saab";
  const darZoneBg = isSaab
    ? "var(--mui-palette-m3-surfaceContainer)"
    : "var(--mui-palette-m3-statusWarningContainer)";
  const readyZoneBg = isSaab
    ? "var(--mui-palette-m3-surfaceContainer)"
    : "var(--mui-palette-m3-primaryContainer)";
  const readyLaneBg = isSaab
    ? "var(--mui-palette-m3-surfaceContainerHigh)"
    : "var(--mui-palette-m3-surfaceContainer)";
  // Readiness-accent: blått under Saab (gult kan inte vara förgrund), primary i teal.
  const readyAccent = isSaab ? "secondary.main" : "primary.main";

  const laneSection = section as unknown as LaneSection;
  const [laneRows, setLaneRows] = useState<LaneAssignment[]>([]);
  useEffect(() => {
    void fetchAllLanes(laneSection).then(setLaneRows);
    const channel = subscribeLaneAssignments(laneSection, setLaneRows);
    return () => unsubscribe(channel);
  }, [laneSection]);
  const lanes = laneRows.map((l) => l.lane_number);
  const occupiedRows = laneRows.filter((l) => l.status === "occupied");

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary", p: 3 }}>
      <Container maxWidth="md" sx={{ px: 0 }}>
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 10, letterSpacing: "0.3em", color: "warning.main", textTransform: "uppercase", mb: 0.5 }}>
            Wizard · {section.toUpperCase()} · facilitator-only
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Backstage control
          </Typography>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
            Inte synlig för test-instruktörer. Driver fejkdata och scenario.
          </Typography>
        </Box>

        {/* Session info */}
        <Card sx={{ p: 2.5, mb: 2, bgcolor: "var(--mui-palette-m3-surfaceContainerLow)" }}>
          <Typography sx={{ fontSize: 11, letterSpacing: "0.15em", color: "text.secondary", textTransform: "uppercase", mb: 1 }}>
            Active session
          </Typography>
          {loading && <Typography sx={{ fontSize: 14 }}>Loading…</Typography>}
          {!loading && session && (
            <Stack spacing={0.5} sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: 12, color: "text.secondary" }}>
              <span>id: {session.id.slice(0, 8)}…</span>
              <span>phase: <Box component="span" sx={{ color: "text.primary" }}>{session.phase}</Box></span>
              <span>exercises: {session.exercise_list.length}</span>
              <span>current_index: {session.current_exercise_index}</span>
              <span>lane_ui_visible: {String(session.lane_ui_visible)}</span>
            </Stack>
          )}
          {!loading && !session && (
            <Stack spacing={1.5}>
              <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                No session for <Box component="span" sx={{ fontFamily: '"Roboto Mono", monospace', color: "text.primary" }}>{section}</Box>. Create one to enable the controls below.
              </Typography>
              <Button variant="contained" size="small" onClick={() => void createIdleSession(section)}>
                Create idle session
              </Button>
            </Stack>
          )}
        </Card>

        {/* Session actions */}
        <Card sx={{ p: 2.5, mb: 2, bgcolor: "var(--mui-palette-m3-surfaceContainerLow)" }}>
          <Typography sx={{ fontSize: 11, letterSpacing: "0.15em", color: "text.secondary", textTransform: "uppercase", mb: 1.5 }}>
            Session actions
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }} useFlexGap>
            <Button variant="outlined" size="small" disabled={!session} onClick={() => session && void resetSession(session.id)}>
              Reset to idle
            </Button>
            <Button variant="outlined" size="small" disabled={!session} onClick={() => session && void setExerciseList(session.id, DEMO_EXERCISES)}>
              Load demo exercises ({DEMO_EXERCISES.length})
            </Button>
            <Button variant="outlined" size="small" disabled={!session} onClick={() => session && void setPhase(session.id, "check-in")}>
              Jump to check-in
            </Button>
          </Stack>
        </Card>

        {/* Inject remote — touch-friendly */}
        <Card sx={{ p: 2.5, mb: 2, bgcolor: "var(--mui-palette-m3-surfaceContainerLow)" }}>
          <Typography sx={{ fontSize: 11, letterSpacing: "0.15em", color: "text.secondary", textTransform: "uppercase", mb: 1.5 }}>
            Inject remote press (test without keyboard)
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, maxWidth: 400 }}>
            <Box />
            <Button variant="outlined" sx={{ minHeight: 48 }} onClick={() => pressRemote("up")}>▲</Button>
            <Box />
            <Button variant="outlined" sx={{ minHeight: 48 }} onClick={() => pressRemote("left")}>◀</Button>
            <Button variant="contained" sx={{ minHeight: 48 }} onClick={() => pressRemote("ok")}>OK</Button>
            <Button variant="outlined" sx={{ minHeight: 48 }} onClick={() => pressRemote("right")}>▶</Button>
            <Button variant="outlined" sx={{ minHeight: 48, fontSize: 12 }} onClick={() => pressRemote("back")}>BACK</Button>
            <Button variant="outlined" sx={{ minHeight: 48 }} onClick={() => pressRemote("down")}>▼</Button>
            <Button variant="outlined" sx={{ minHeight: 48, fontSize: 12 }} onClick={() => pressRemote("holdOk")}>HOLD</Button>
          </Box>
        </Card>

        {/* DAR WoZ */}
        <Card sx={{ p: 2.5, mb: 2, bgcolor: darZoneBg, opacity: 0.95 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Box>
              <Typography sx={{ fontSize: 11, letterSpacing: "0.15em", color: "warning.main", textTransform: "uppercase" }}>
                DAR signals · Wizard-of-Oz (spår 03)
              </Typography>
              <Typography sx={{ fontSize: 10, color: "text.secondary", mt: 0.5 }}>
                Drive triage state per lane. Appears live on /tablet during the exercise phase. Never on the duk.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Button
                variant="outlined"
                size="small"
                disabled={!session || lanes.length === 0}
                onClick={() => {
                  if (!session) return;
                  const shuffled = [...lanes].sort(() => Math.random() - 0.5);
                  const statuses: DarStatus[] = ["red", "yellow", "yellow", "green", "green", "green", "green"];
                  shuffled.forEach((lane, i) => {
                    const status = statuses[i] ?? "green";
                    void setSignal(session.id, section, lane, status);
                  });
                }}
              >
                Random scenario
              </Button>
              <Button
                variant="text"
                size="small"
                disabled={!session}
                onClick={() => session && void clearAllSignals(session.id)}
                sx={{ color: "warning.main" }}
              >
                Clear all
              </Button>
            </Stack>
          </Stack>

          {lanes.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>No lanes configured for this section.</Typography>
          ) : (
            <Stack spacing={1}>
              {lanes.map((lane) => {
                const current = byLane.get(lane)?.status;
                const setStatus = (status: DarStatus) => {
                  if (!session) return;
                  void setSignal(session.id, section, lane, status);
                };
                return (
                  <Stack key={lane} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography sx={{ width: 48, fontSize: 12, fontFamily: '"Roboto Mono", monospace', color: "text.secondary" }}>
                      Lane {lane}
                    </Typography>
                    <ToggleButtonGroup
                      value={current ?? null}
                      exclusive
                      onChange={(_, v) => v && setStatus(v as DarStatus)}
                      size="small"
                      sx={{
                        flex: 1,
                        "& .MuiToggleButton-root": {
                          flex: 1,
                          borderRadius: "8px !important",
                          fontSize: 10,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          minHeight: 32,
                        },
                      }}
                    >
                      <ToggleButton value="green" color="success">green</ToggleButton>
                      <ToggleButton value="yellow" color="warning">yellow</ToggleButton>
                      <ToggleButton value="red" color="error">red</ToggleButton>
                    </ToggleButtonGroup>
                    <Button
                      size="small"
                      variant="text"
                      disabled={!current || !session}
                      onClick={() => session && void clearSignal(session.id, lane)}
                      sx={{ fontSize: 10, minWidth: 50, color: isSaab ? "text.secondary" : undefined }}
                    >
                      clear
                    </Button>
                  </Stack>
                );
              })}
            </Stack>
          )}
        </Card>

        {/* Readiness WoZ */}
        <Card sx={{ p: 2.5, bgcolor: readyZoneBg, opacity: 0.95 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Box>
              <Typography sx={{ fontSize: 11, letterSpacing: "0.15em", color: readyAccent, textTransform: "uppercase" }}>
                Lane readiness · Wizard-of-Oz (spår 02 halva A)
              </Typography>
              <Typography sx={{ fontSize: 10, color: "text.secondary", mt: 0.5 }}>
                Drive weapon / battery / ammo / comms status per lane. Visible publicly on the duk during check-in. Defaults to OK when a trainee blips in.
              </Typography>
            </Box>
          </Stack>

          {occupiedRows.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              No trainees checked in yet. Statuses only appear once a lane is occupied.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {occupiedRows.map((row) => (
                <Card key={row.lane_number} sx={{ p: 1.5, bgcolor: readyLaneBg }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography sx={{ fontSize: 12 }}>
                      <Box component="span" sx={{ fontFamily: '"Roboto Mono", monospace', color: "text.secondary" }}>
                        Lane {row.lane_number}
                      </Box>{" "}
                      <Box component="span">· {row.name ?? "—"}</Box>
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      sx={{ fontSize: 10, minHeight: 32, color: readyAccent }}
                      onClick={() => void resetLaneToOk(laneSection, row.lane_number)}
                    >
                      All OK
                    </Button>
                  </Stack>
                  <Stack spacing={0.75}>
                    {(["weapon", "battery", "ammo", "comms"] as ReadinessIndicator[]).map((ind) => (
                      <ReadinessRow
                        key={ind}
                        label={ind}
                        current={(row[`${ind}_status`] ?? "na") as ReadinessStatus}
                        onSet={(s) => void setLaneIndicator(laneSection, row.lane_number, ind, s)}
                      />
                    ))}
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}
        </Card>
      </Container>
    </Box>
  );
}

function ReadinessRow({
  label,
  current,
  onSet,
}: {
  label: string;
  current: ReadinessStatus;
  onSet: (s: ReadinessStatus) => void;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Typography sx={{ width: 64, fontSize: 10, fontFamily: '"Roboto Mono", monospace', color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </Typography>
      <ToggleButtonGroup
        value={current === "na" ? null : current}
        exclusive
        onChange={(_, v) => v && onSet(v as ReadinessStatus)}
        size="small"
        sx={{
          flex: 1,
          "& .MuiToggleButton-root": {
            flex: 1,
            borderRadius: "8px !important",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            minHeight: 32,
          },
        }}
      >
        <ToggleButton value="ok" color="success">ok</ToggleButton>
        <ToggleButton value="warning" color="warning">warning</ToggleButton>
        <ToggleButton value="critical" color="error">critical</ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
}
