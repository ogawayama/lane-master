import { useEffect, useRef, useState } from "react";
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
  resetAllAssignments,
  type LaneAssignment,
  type Section as LaneSection,
} from "@/services/assignmentService";
import { subscribeLaneAssignments, unsubscribe } from "@/services/realtimeService";
import { EXERCISE_CATALOG } from "@/data/exerciseCatalog";
import { ScenarioPanel } from "@/components/prototyp/ScenarioPanel";

/**
 * Helhetsprototyp — WizardShell (M3-omskrivning 2026-05-28).
 *
 * Facilitator backstage-panel. M3 Cards för sektioner, MUI Buttons,
 * ToggleButtonGroup för DAR/readiness-väljare (M3 segmented button-
 * stil). Större touch-targets (h: 48px) per UX-review.
 */

// Demo-genvägen härleds ur EXERCISE_CATALOG — tidigare var listan en
// kopia med egna bilder, så samma övning såg olika ut beroende på om
// passet startades via /wizard-demo eller PreparePage.
const DEMO_IDS = ["basic-glock-paper", "adv-3d-rifle", "cg-heat-single"];
const DEMO_EXERCISES = EXERCISE_CATALOG.filter((ex) => DEMO_IDS.includes(ex.id)).map(
  (ex) => ({
    id: ex.id,
    title: ex.title,
    weapon: ex.weaponTypes[0],
    image: ex.image,
    hits_threshold: ex.hits_threshold,
    time_seconds: ex.time_seconds,
    spread_threshold: ex.spread_threshold,
  }),
);

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

  // Destruktiva actions kräver två tryck — ett facilitator-felklick på
  // "Reset" mitt i exercise skulle annars förstöra testpasset.
  const [armedAction, setArmedAction] = useState<"reset" | "newSubject" | null>(null);
  const armTimer = useRef<number | null>(null);
  const armOrRun = (action: "reset" | "newSubject", run: () => void) => {
    if (armedAction === action) {
      if (armTimer.current !== null) window.clearTimeout(armTimer.current);
      setArmedAction(null);
      run();
      return;
    }
    setArmedAction(action);
    if (armTimer.current !== null) window.clearTimeout(armTimer.current);
    armTimer.current = window.setTimeout(() => setArmedAction(null), 3000);
  };
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
            Not visible to test instructors. Drives mock data and scenarios.
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
            <Button variant="outlined" size="small" disabled={!session} onClick={() => session && void setExerciseList(session.id, DEMO_EXERCISES)}>
              Load demo exercises ({DEMO_EXERCISES.length})
            </Button>
            <Button variant="outlined" size="small" disabled={!session} onClick={() => session && void setPhase(session.id, "check-in")}>
              Jump to check-in
            </Button>
            <Button
              variant="outlined"
              size="small"
              color={armedAction === "reset" ? "error" : undefined}
              disabled={!session}
              onClick={() =>
                session && armOrRun("reset", () => void resetSession(session.id))
              }
            >
              {armedAction === "reset" ? "Tap again to confirm reset" : "Reset to idle"}
            </Button>
            <Button
              variant="outlined"
              size="small"
              color={armedAction === "newSubject" ? "error" : undefined}
              disabled={!session}
              onClick={() =>
                session &&
                armOrRun("newSubject", () => {
                  // Samlad nollställning inför nästa testperson:
                  // session → idle (+ dar_signals rensas i resetSession),
                  // lanes töms och vapen släpps.
                  void resetSession(session.id);
                  void resetAllAssignments(laneSection);
                })
              }
            >
              {armedAction === "newSubject" ? "Tap again to confirm" : "New test subject"}
            </Button>
          </Stack>
          <Typography sx={{ fontSize: 10, color: "text.secondary", mt: 1 }}>
            New test subject = session to idle + clear DAR signals + empty all lanes and release weapons.
          </Typography>
        </Card>

        {/* Pass 8 — scriptat scenario + eventlogg */}
        <ScenarioPanel session={session} section={section} laneRows={laneRows} byLane={byLane} />

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
                DAR signals · Wizard-of-Oz
              </Typography>
              <Typography sx={{ fontSize: 10, color: "text.secondary", mt: 0.5 }}>
                Drive triage state per lane. Appears live on /tablet during the exercise phase. Never on the projector.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Button
                variant="outlined"
                size="small"
                disabled={!session || occupiedRows.length === 0}
                onClick={() => {
                  if (!session) return;
                  // Endast incheckade banor — en röd signal på en tom
                  // bana (namn "—") är ett falsklarm som stör testet.
                  const occupied = occupiedRows.map((r) => r.lane_number);
                  const shuffled = [...occupied].sort(() => Math.random() - 0.5);
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
                          minHeight: 44, // iPad touch-target
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
                      sx={{ fontSize: 10, minWidth: 50, minHeight: 44, color: isSaab ? "text.secondary" : undefined }}
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
                Lane readiness · Wizard-of-Oz
              </Typography>
              <Typography sx={{ fontSize: 10, color: "text.secondary", mt: 0.5 }}>
                Drive weapon / battery / ammo / comms status per lane. Visible publicly on the projector during check-in. Defaults to OK when a trainee blips in.
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
                      sx={{ fontSize: 10, minHeight: 44, color: readyAccent }}
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
            minHeight: 44, // iPad touch-target
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
