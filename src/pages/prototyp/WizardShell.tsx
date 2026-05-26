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
      <section className="rounded-lg border border-border bg-card p-5">
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
    </div>
  );
}
