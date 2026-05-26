import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import {
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

  // Read lanes from DB so the DAR panel adapts to studio size.
  const [lanes, setLanes] = useState<number[]>([]);
  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("lane_assignments")
      .select("lane_number")
      .eq("section", section)
      .order("lane_number")
      .then(({ data }) => {
        if (!cancelled && data) setLanes(data.map((d) => d.lane_number));
      });
    return () => {
      cancelled = true;
    };
  }, [section]);

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

      {/* Session info */}
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

      {/* Remote injection — for testing without a keyboard */}
      <section className="rounded-lg border border-border bg-card p-5 mb-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Inject remote press (test without keyboard)
        </div>
        <div className="grid grid-cols-3 gap-2 max-w-xs">
          <div />
          <Button size="sm" variant="outline" onClick={() => pressRemote("up")}>▲</Button>
          <div />
          <Button size="sm" variant="outline" onClick={() => pressRemote("left")}>◀</Button>
          <Button size="sm" variant="default" onClick={() => pressRemote("ok")}>OK</Button>
          <Button size="sm" variant="outline" onClick={() => pressRemote("right")}>▶</Button>
          <Button size="sm" variant="outline" onClick={() => pressRemote("back")}>BACK</Button>
          <Button size="sm" variant="outline" onClick={() => pressRemote("down")}>▼</Button>
          <Button size="sm" variant="outline" onClick={() => pressRemote("holdOk")}>HOLD</Button>
        </div>
      </section>

      {/* DAR Wizard-of-Oz signaller — Pass 5 */}
      <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-amber-500">
              DAR signals · Wizard-of-Oz (spår 03)
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Drive triage state per lane. Appears live on /tablet during the
              exercise phase. Never on the duk.
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            disabled={!session}
            onClick={() => session && void clearAllSignals(session.id)}
            className="text-amber-600 hover:text-amber-700"
          >
            Clear all
          </Button>
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
    </div>
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
