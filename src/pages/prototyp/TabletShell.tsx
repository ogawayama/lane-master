import { useSearchParams } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import {
  setPhase,
  type Section,
  type SessionPhase,
} from "@/services/sessionService";
import { Button } from "@/components/ui/button";

/**
 * Helhetsprototyp — TabletShell (Pass 0).
 *
 * Instruktörens privata yta — "kontrollrum"-språk per
 * helhetsprototyp/plan.md §3. I Pass 0 är detta en enkel
 * state-machine-driver så vi kan flytta /duk genom faserna utan
 * att behöva gå till /wizard.
 *
 * Pass 2 lägger till pre-pass preparation (övningslista-byggare).
 * Pass 5 lägger till DAR-triage.
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

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
          Tablet · {section.toUpperCase()}
        </div>
        <h1 className="text-2xl font-semibold">Instructor control</h1>
        <p className="text-sm text-muted-foreground">
          Helhetsprototyp · Pass 0 skelett. Phase-controls här tills riktiga
          ytor byggs i Pass 2/5.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Current phase
        </div>
        <div className="text-3xl font-mono mb-6">
          {loading ? "…" : session?.phase ?? "no session"}
        </div>

        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Drive phase
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

      <div className="mt-6 text-xs text-muted-foreground">
        Open <code>/duk?section={section}</code> on another window to see the
        projector view react.
      </div>
    </div>
  );
}
