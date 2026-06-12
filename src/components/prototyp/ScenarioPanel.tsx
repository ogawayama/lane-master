import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Card, Chip, Stack, Typography } from "@mui/material";
import { toast } from "sonner";
import type { SessionRow, Section } from "@/services/sessionService";
import {
  resetSession,
  setExerciseList,
  setPhase,
} from "@/services/sessionService";
import type { LaneAssignment, Section as LaneSection } from "@/services/assignmentService";
import { resetAllAssignments } from "@/services/assignmentService";
import type { DarSignal } from "@/services/darService";
import { setSignal } from "@/services/darService";
import { useRemoteControl } from "@/hooks/useRemoteControl";
import {
  SCENARIO_BEATS,
  SCENARIO_EXERCISES,
  SCENARIO_TRAINEES,
  seedScenarioTrainees,
  deriveCheckpoints,
  exportLog,
  type ScenarioEvent,
  type ScenarioEventType,
} from "@/services/scenarioService";

/**
 * Helhetsprototyp — ScenarioPanel (Pass 8).
 *
 * Facilitatorns scriptade demo-scenario + eventlogg i /wizard.
 * Loggen byggs här eftersom wizarden redan prenumererar på allt
 * (session, lanes, DAR) och tar emot fjärrtryck via broadcast-bryggan
 * — en klocka, inga DB-ändringar. Det mänskliga scriptet bor i GS-POM:
 * research/scenarioscript-helhetsprototyp.md.
 */

const fmtClock = (iso: string) => iso.slice(11, 19);

export function ScenarioPanel({
  session,
  section,
  laneRows,
  byLane,
}: {
  session: SessionRow | null;
  section: Section;
  laneRows: LaneAssignment[];
  byLane: Map<number, DarSignal>;
}) {
  const [events, setEvents] = useState<ScenarioEvent[]>([]);
  const log = useCallback((type: ScenarioEventType, detail: string) => {
    setEvents((cur) => [...cur, { at: new Date().toISOString(), type, detail }]);
  }, []);

  // — Fasbyten + övningsindex —
  const prevPhase = useRef<string | null>(null);
  useEffect(() => {
    const phase = session?.phase ?? null;
    if (phase && prevPhase.current && phase !== prevPhase.current) {
      log("phase", `${prevPhase.current} → ${phase}`);
    }
    prevPhase.current = phase;
  }, [session?.phase, log]);

  const prevIndex = useRef<number | null>(null);
  useEffect(() => {
    const idx = session?.current_exercise_index ?? null;
    if (idx !== null && prevIndex.current !== null && idx !== prevIndex.current) {
      log("exercise-index", `exercise index ${prevIndex.current} → ${idx}`);
    }
    prevIndex.current = idx;
  }, [session?.current_exercise_index, log]);

  // — Fjärrtryck (egna + bryggade från andra ytor) —
  useRemoteControl(useCallback((e) => log("remote", e), [log]));

  // — DAR-signaler —
  const prevSignals = useRef<Map<number, string>>(new Map());
  useEffect(() => {
    const cur = new Map<number, string>();
    byLane.forEach((s, lane) => cur.set(lane, s.status));
    cur.forEach((status, lane) => {
      if (prevSignals.current.get(lane) !== status) {
        log("dar-signal", `lane ${lane} → ${status}`);
      }
    });
    prevSignals.current.forEach((_, lane) => {
      if (!cur.has(lane)) log("dar-signal", `lane ${lane} → cleared`);
    });
    prevSignals.current = cur;
  }, [byLane, log]);

  // — Incheckning + readiness —
  const prevLanes = useRef<Map<number, string>>(new Map());
  useEffect(() => {
    const cur = new Map<number, string>();
    for (const l of laneRows) {
      const ready = [l.weapon_status, l.battery_status, l.ammo_status, l.comms_status]
        .map((s) => s ?? "na")
        .join("/");
      cur.set(l.lane_number, `${l.status}:${l.name ?? ""}:${ready}`);
      const prev = prevLanes.current.get(l.lane_number);
      if (prev !== undefined && prev !== cur.get(l.lane_number)) {
        const [prevStatus] = prev.split(":");
        if (prevStatus !== l.status) {
          log(
            "lane-occupancy",
            `lane ${l.lane_number} ${prevStatus} → ${l.status}${l.name ? ` (${l.name})` : ""}`,
          );
        } else {
          log("readiness", `lane ${l.lane_number} readiness ${ready}`);
        }
      }
    }
    prevLanes.current = cur;
  }, [laneRows, log]);

  // — Script-actions —
  const laneSection = section as unknown as LaneSection;
  const setUpScenario = async () => {
    if (!session) return;
    log("facilitator", "scenario set-up started");
    await resetSession(session.id);
    await resetAllAssignments(laneSection);
    await seedScenarioTrainees(laneSection);
    await setExerciseList(session.id, SCENARIO_EXERCISES);
    await setPhase(session.id, "select-exercise");
    log("facilitator", "scenario ready — picker on projector");
    toast.success("Scenario ready: 3 trainees seeded, 3 exercises planned.");
  };

  const checkpoints = deriveCheckpoints(events);
  const interventions = events.filter((e) => e.type === "dar-signal" || e.type === "readiness").length;

  const copyLog = () => {
    void navigator.clipboard.writeText(exportLog(events));
    toast.success("Log copied as JSON.");
  };
  const downloadLog = () => {
    const blob = new Blob([exportLog(events)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scenario-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Card sx={{ p: 2.5, mb: 2, bgcolor: "var(--mui-palette-m3-surfaceContainer)" }}>
      <Typography sx={{ fontSize: 11, letterSpacing: "0.15em", color: "warning.main", textTransform: "uppercase" }}>
        Scripted scenario · event log
      </Typography>
      <Typography sx={{ fontSize: 10, color: "text.secondary", mt: 0.5, mb: 1.5 }}>
        Follow the facilitator script (GS-POM research/scenarioscript-helhetsprototyp.md).
        Everything below is logged with timestamps for post-test analysis.
      </Typography>

      {/* Steg 1 — uppsättning */}
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
        <Button variant="contained" size="small" disabled={!session} onClick={() => void setUpScenario()}>
          Set up scenario
        </Button>
        <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
          = reset + {SCENARIO_TRAINEES.length} trainees on lanes + {SCENARIO_EXERCISES.length}-exercise plan → picker
        </Typography>
      </Stack>

      {/* WoZ-beats per övning */}
      <Typography sx={{ fontSize: 10, letterSpacing: "0.1em", color: "text.secondary", textTransform: "uppercase", mb: 0.75 }}>
        Beats — inject during the exercise phase
      </Typography>
      <Stack spacing={0.75} sx={{ mb: 1.5 }}>
        {SCENARIO_BEATS.map((b, i) => (
          <Stack key={i} direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Chip
              label={`Ex ${b.exerciseIndex + 1}`}
              size="small"
              sx={{ width: 52, height: 22, fontSize: 10, fontFamily: '"Roboto Mono", monospace' }}
            />
            <Typography sx={{ width: 70, fontSize: 10, color: "text.secondary", fontFamily: '"Roboto Mono", monospace' }}>
              {b.cue}
            </Typography>
            <Typography sx={{ flex: 1, fontSize: 12 }}>{b.label}</Typography>
            <Button
              size="small"
              variant="outlined"
              disabled={!session}
              sx={{ minHeight: 36, fontSize: 11 }}
              onClick={() => {
                if (!session) return;
                void setSignal(session.id, section, b.lane, b.status);
                log("facilitator", `beat injected: ${b.label}`);
              }}
            >
              Inject {b.status}
            </Button>
          </Stack>
        ))}
      </Stack>

      {/* Checkpoints */}
      {checkpoints.length > 0 && (
        <>
          <Typography sx={{ fontSize: 10, letterSpacing: "0.1em", color: "text.secondary", textTransform: "uppercase", mb: 0.75 }}>
            Checkpoints
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mb: 1.5 }}>
            {checkpoints.map((c, i) => (
              <Chip
                key={i}
                label={`${c.label} · ${fmtClock(c.at)}`}
                size="small"
                sx={{ height: 24, fontSize: 11 }}
              />
            ))}
          </Stack>
        </>
      )}

      {/* Logg */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.75 }}>
        <Typography sx={{ flex: 1, fontSize: 10, letterSpacing: "0.1em", color: "text.secondary", textTransform: "uppercase" }}>
          Log · {events.length} events · {interventions} interventions
        </Typography>
        <Button size="small" variant="text" disabled={events.length === 0} onClick={copyLog} sx={{ fontSize: 10, color: "text.secondary" }}>
          Copy JSON
        </Button>
        <Button size="small" variant="text" disabled={events.length === 0} onClick={downloadLog} sx={{ fontSize: 10, color: "text.secondary" }}>
          Download
        </Button>
        <Button size="small" variant="text" disabled={events.length === 0} onClick={() => setEvents([])} sx={{ fontSize: 10, color: "text.secondary" }}>
          Clear
        </Button>
      </Stack>
      <Box
        sx={{
          maxHeight: 160,
          overflowY: "auto",
          borderRadius: 1.5,
          border: 1,
          borderColor: "divider",
          p: 1,
          fontFamily: '"Roboto Mono", monospace',
          fontSize: 11,
          color: "text.secondary",
        }}
      >
        {events.length === 0 && <span>No events yet — they appear as the session moves.</span>}
        {events.slice(-40).map((e, i) => (
          <Box key={i}>
            {fmtClock(e.at)} <Box component="span" sx={{ color: "text.primary" }}>[{e.type}]</Box> {e.detail}
          </Box>
        ))}
      </Box>
    </Card>
  );
}
