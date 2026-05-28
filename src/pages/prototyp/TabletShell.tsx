import { Link, useSearchParams } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import {
  setPhase,
  type Section,
  type SessionPhase,
} from "@/services/sessionService";
import { Button } from "@/components/ui/button";
import { DARTablet } from "@/components/prototyp/DARTablet";
import { MiniBangridTablet } from "@/components/prototyp/MiniBangridTablet";
import { MiniAARTablet } from "@/components/prototyp/MiniAARTablet";
import type { Section as LaneSection } from "@/services/assignmentService";

/**
 * Helhetsprototyp — TabletShell.
 *
 * Instruktörens privata yta — "kontrollrum"-språk per
 * helhetsprototyp/plan.md §3. Phase-switchar nu, speglar /duk:s mönster:
 *
 *   idle/prepare → "Build session"-CTA + phase-debug-panel
 *   check-in     → väntar (check-in körs på terminal + duk)
 *   preflight    → väntar (instruktören driver med fjärr)
 *   exercise     → DARTablet (Pass 5 — DAR triage)
 *   aar          → väntar (instruktör driver AAR med fjärr; Pass 6
 *                  kan ev lägga mirror-vy här)
 *
 * Phase-debug-panelen behålls längst ned — felsökningsverktyg.
 *
 * Section kan väljas via ?section=idt (default idt).
 */

const PHASES: SessionPhase[] = [
  "idle",
  "prepare",
  "check-in",
  "preflight",
  "exercise",
  "aar",
  "ended",
];

export default function TabletShell() {
  const [searchParams] = useSearchParams();
  const section = (searchParams.get("section") ?? "idt") as Section;
  const { session, loading } = useSession(section);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Connecting…
      </div>
    );
  }

  // Exercise-fasen tar över hela tabletten — det är arbetsytan.
  if (session && session.phase === "exercise") {
    return <DARTablet sessionId={session.id} section={section} />;
  }

  const showPrepareCta =
    !session || session.phase === "idle" || session.phase === "prepare";

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
          Tablet · {section.toUpperCase()}
        </div>
        <h1 className="text-2xl font-semibold">Instructor control</h1>
        <p className="text-sm text-muted-foreground">
          Phase-aware. Real surfaces appear during their phase; phase-controls
          below for debugging.
        </p>
      </div>

      {showPrepareCta && (
        <Link
          to={`/tablet/prepare?section=${section}`}
          className="block mb-4 rounded-lg border-2 border-primary/40 bg-primary/5 p-5 hover:bg-primary/10 transition-colors"
        >
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-1">
            Pre-pass · spår 01
          </div>
          <div className="font-medium text-lg">Build today's session →</div>
          <div className="text-sm text-muted-foreground mt-1">
            Pick exercises in order before trainees arrive.
          </div>
        </Link>
      )}

      {/* Phase-specifika paneler. Tabletten visar inte BARA "vänta-text"
          längre — under check-in och aar speglas duken kompakt så
          instruktören kan följa utan att titta upp (UX-iteration 2026-05-28). */}
      {session && session.phase === "select-exercise" && (
        <WaitingPanel
          title="Pick on the projector"
          body="The exercise carousel is showing on the projector. Use ◀ ▶ to navigate and OK to select the starting exercise."
        />
      )}
      {session && session.phase === "check-in" && (
        <MiniBangridTablet section={section as unknown as LaneSection} />
      )}
      {session && session.phase === "preflight" && (
        <WaitingPanel
          title="Briefing on the screen"
          body="The criteria screen is showing on the projector. Press OK on the remote to start the exercise."
        />
      )}
      {session && session.phase === "aar" && (
        <MiniAARTablet
          exercise={
            session.exercise_list[session.current_exercise_index] ?? null
          }
          section={section}
        />
      )}
      {session && session.phase === "ended" && (
        <WaitingPanel
          title="Session ended"
          body="All exercises done. Reset from /wizard to start over."
        />
      )}

      <details className="mt-6">
        <summary className="text-xs uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground">
          Debug · phase controls
        </summary>
        <div className="mt-3 rounded-lg border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Current phase
          </div>
          <div className="text-2xl font-mono mb-4">
            {session?.phase ?? "no session"}
          </div>
          <div className="flex flex-wrap gap-2">
            {PHASES.map((p) => (
              <Button
                key={p}
                variant={session?.phase === p ? "default" : "outline"}
                size="sm"
                disabled={!session}
                onClick={() => session && void setPhase(session.id, p)}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

function WaitingPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">
        On the projector now
      </div>
      <div className="text-xl font-semibold mb-1">{title}</div>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
