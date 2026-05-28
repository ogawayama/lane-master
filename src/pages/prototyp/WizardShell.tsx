import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import {
  createIdleSession,
  resetSession,
  setExerciseList,
  setPhase,
  type Section,
} from "@/services/sessionService";
import { pressRemote } from "@/hooks/useRemoteControl";
import { Button } from "@/components/ui/button";
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
 * Helhetsprototyp — WizardShell (Pass 0).
 *
 * Facilitatorns gömda kontrollpanel — driver fejkdata och
 * scenario-events under prototyp-test. Per helhetsprototyp/plan.md §3.
 *
 * I Pass 0 gör panelen tre saker:
 *  1. Reset:a sessionen ("börja om")
 *  2. Pusha demo-övningslista (3 övningar) så Pass 3+ har data att rendera
 *  3. Skicka fjärr-events programmatiskt (för test utan keyboard)
 *
 * Pass 5 utökar panelen med röd/gul/grön per bana för DAR-triage WoZ.
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

  // Realtime lane state — driver både DAR-panelen (behöver bara lane_number)
  // och readiness-panelen (behöver weapon/battery/ammo/comms_status).
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
    <div className="min-h-screen bg-background text-foreground p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-amber-500 mb-1">
          Wizard · {section.toUpperCase()} · facilitator-only
        </div>
        <h1 className="text-2xl font-semibold">Backstage control</h1>
        <p className="text-sm text-muted-foreground">
          Inte synlig för test-instruktörer. Driver fejkdata och scenario.
        </p>
      </div>

      {/* Session info — visa Create-knapp om ingen session existerar
          (UX-review 2026-05-28: tidigare visade hooken "Loading…" för
          alltid när rad saknades, och alla knappar var disabled). */}
      <section className="rounded-lg border border-border bg-card p-5 mb-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Active session
        </div>
        {loading && <div className="text-sm">Loading…</div>}
        {!loading && session && (
          <div className="font-mono text-xs space-y-1 text-muted-foreground">
            <div>id: {session.id.slice(0, 8)}…</div>
            <div>phase: <span className="text-foreground">{session.phase}</span></div>
            <div>exercises: {session.exercise_list.length}</div>
            <div>current_index: {session.current_exercise_index}</div>
            <div>lane_ui_visible: {String(session.lane_ui_visible)}</div>
          </div>
        )}
        {!loading && !session && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              No session for <span className="font-mono text-foreground">{section}</span>. Create one to enable the controls below.
            </div>
            <Button
              size="sm"
              onClick={() => void createIdleSession(section)}
            >
              Create idle session
            </Button>
          </div>
        )}
      </section>

      {/* Session actions */}
      <section className="rounded-lg border border-border bg-card p-5 mb-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Session actions
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!session}
            onClick={() => session && void resetSession(session.id)}
          >
            Reset to idle
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!session}
            onClick={() =>
              session && void setExerciseList(session.id, DEMO_EXERCISES)
            }
          >
            Load demo exercises ({DEMO_EXERCISES.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!session}
            onClick={() => session && void setPhase(session.id, "check-in")}
          >
            Jump to check-in
          </Button>
        </div>
      </section>

      {/* Remote injection — for testing without a keyboard. Touch-targets
          ≥44pt så facilitatorn kan trycka snabbt under stress (UX-review
          2026-05-28). */}
      <section className="rounded-lg border border-border bg-card p-5 mb-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Inject remote press (test without keyboard)
        </div>
        <div className="grid grid-cols-3 gap-2 max-w-sm">
          <div />
          <Button className="h-12" variant="outline" onClick={() => pressRemote("up")}>▲</Button>
          <div />
          <Button className="h-12" variant="outline" onClick={() => pressRemote("left")}>◀</Button>
          <Button className="h-12" variant="default" onClick={() => pressRemote("ok")}>OK</Button>
          <Button className="h-12" variant="outline" onClick={() => pressRemote("right")}>▶</Button>
          <Button className="h-12 text-xs" variant="outline" onClick={() => pressRemote("back")}>BACK</Button>
          <Button className="h-12" variant="outline" onClick={() => pressRemote("down")}>▼</Button>
          <Button className="h-12 text-xs" variant="outline" onClick={() => pressRemote("holdOk")}>HOLD</Button>
        </div>
      </section>

      {/* DAR Wizard-of-Oz signaller — Pass 5 */}
      <section className="rounded-lg border border-status-warning/30 bg-status-warning/5 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-status-warning">
              DAR signals · Wizard-of-Oz (spår 03)
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Drive triage state per lane. Appears live on /tablet during the
              exercise phase. Never on the duk.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!session || lanes.length === 0}
              onClick={() => {
                if (!session) return;
                // Realistisk WoZ-mix: ~1 röd, ~2 gula, resten grön
                // (matchar typisk gruppsession). Seedat med Math.random
                // för spontan variation mellan körningar.
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
              size="sm"
              variant="ghost"
              disabled={!session}
              onClick={() => session && void clearAllSignals(session.id)}
              className="text-status-warning hover:text-status-warning/80"
            >
              Clear all
            </Button>
          </div>
        </div>

        {lanes.length === 0 ? (
          <div className="text-xs text-muted-foreground">No lanes configured for this section.</div>
        ) : (
          <div className="space-y-2">
            {lanes.map((lane) => {
              const current = byLane.get(lane)?.status;
              const setStatus = (status: DarStatus) => {
                if (!session) return;
                void setSignal(session.id, section, lane, status);
              };
              return (
                <div key={lane} className="flex items-center gap-2">
                  <div className="text-xs font-mono w-12 text-muted-foreground">
                    Lane {lane}
                  </div>
                  <div className="flex gap-1.5 flex-1">
                    <SignalBtn
                      label="green"
                      active={current === "green"}
                      onClick={() => setStatus("green")}
                    />
                    <SignalBtn
                      label="yellow"
                      active={current === "yellow"}
                      onClick={() => setStatus("yellow")}
                    />
                    <SignalBtn
                      label="red"
                      active={current === "red"}
                      onClick={() => setStatus("red")}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!current || !session}
                      onClick={() => session && void clearSignal(session.id, lane)}
                      className="text-[10px] h-7 px-2"
                    >
                      clear
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Readiness Wizard-of-Oz — Pass 1.5 */}
      <section className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-sky-500">
              Lane readiness · Wizard-of-Oz (spår 02 halva A)
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Drive weapon / battery / ammo / comms status per lane.
              Visible publicly on the duk during check-in. Defaults to OK
              when a trainee blips in.
            </div>
          </div>
        </div>

        {occupiedRows.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            No trainees checked in yet. Statuses only appear once a lane
            is occupied.
          </div>
        ) : (
          <div className="space-y-3">
            {occupiedRows.map((row) => (
              <div key={row.lane_number} className="rounded border border-border bg-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs">
                    <span className="font-mono text-muted-foreground">Lane {row.lane_number}</span>{" "}
                    <span className="text-foreground">· {row.name ?? "—"}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px] text-sky-600 hover:text-sky-700"
                    onClick={() => void resetLaneToOk(laneSection, row.lane_number)}
                  >
                    All OK
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <ReadinessRow
                    label="Weapon"
                    indicator="weapon"
                    current={(row.weapon_status ?? "na") as ReadinessStatus}
                    onSet={(s) => void setLaneIndicator(laneSection, row.lane_number, "weapon", s)}
                  />
                  <ReadinessRow
                    label="Battery"
                    indicator="battery"
                    current={(row.battery_status ?? "na") as ReadinessStatus}
                    onSet={(s) => void setLaneIndicator(laneSection, row.lane_number, "battery", s)}
                  />
                  <ReadinessRow
                    label="Ammo"
                    indicator="ammo"
                    current={(row.ammo_status ?? "na") as ReadinessStatus}
                    onSet={(s) => void setLaneIndicator(laneSection, row.lane_number, "ammo", s)}
                  />
                  <ReadinessRow
                    label="Comms"
                    indicator="comms"
                    current={(row.comms_status ?? "na") as ReadinessStatus}
                    onSet={(s) => void setLaneIndicator(laneSection, row.lane_number, "comms", s)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ReadinessRow({
  label,
  current,
  onSet,
}: {
  label: string;
  indicator: ReadinessIndicator;
  current: ReadinessStatus;
  onSet: (s: ReadinessStatus) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-[10px] font-mono w-16 text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className="flex gap-1.5 flex-1">
        <ReadinessBtn label="ok" active={current === "ok"} onClick={() => onSet("ok")} />
        <ReadinessBtn label="warning" active={current === "warning"} onClick={() => onSet("warning")} />
        <ReadinessBtn label="critical" active={current === "critical"} onClick={() => onSet("critical")} />
      </div>
    </div>
  );
}

function ReadinessBtn({
  label,
  active,
  onClick,
}: {
  label: "ok" | "warning" | "critical";
  active: boolean;
  onClick: () => void;
}) {
  const colorClass = {
    ok: active ? "bg-emerald-500 text-white" : "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10",
    warning: active ? "bg-amber-400 text-black" : "border-amber-400/40 text-amber-600 hover:bg-amber-400/10",
    critical: active ? "bg-red-500 text-white" : "border-red-500/40 text-red-600 hover:bg-red-500/10",
  }[label];
  return (
    <button
      onClick={onClick}
      className={`flex-1 h-7 rounded text-[10px] font-medium uppercase tracking-wider border transition-colors ${colorClass}`}
    >
      {label}
    </button>
  );
}

function SignalBtn({
  label,
  active,
  onClick,
}: {
  label: DarStatus;
  active: boolean;
  onClick: () => void;
}) {
  const colorClass = {
    green: active ? "bg-emerald-500 text-white" : "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10",
    yellow: active ? "bg-amber-400 text-black" : "border-amber-400/40 text-amber-600 hover:bg-amber-400/10",
    red: active ? "bg-red-500 text-white" : "border-red-500/40 text-red-600 hover:bg-red-500/10",
  }[label];
  return (
    <button
      onClick={onClick}
      className={`flex-1 h-7 rounded text-[10px] font-medium uppercase tracking-wider border transition-colors ${colorClass}`}
    >
      {label}
    </button>
  );
}
