import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { RemoteOverlay } from "@/components/prototyp/RemoteOverlay";
import { BangridDuk } from "@/components/prototyp/BangridDuk";
import { KriterieDuk } from "@/components/prototyp/KriterieDuk";
import { useRemoteControl, type RemoteEvent } from "@/hooks/useRemoteControl";
import {
  setPhase,
  type Section as SessionSection,
} from "@/services/sessionService";
import type { Section as LaneSection } from "@/services/assignmentService";

/**
 * Helhetsprototyp — DukShell.
 *
 * Detta är projektorduken — full-screen, "biograf"-språk per
 * helhetsprototyp/plan.md §3. Switchar på session.phase och driver
 * phase-transitions via fjärr.
 *
 * Pass 0  skelett + RemoteOverlay
 * Pass 1  bangrid (check-in)
 * Pass 3  kriterieskärm (preflight) + fjärr-driven phase-transitions
 * Pass 4  simulering-placeholder (exercise)
 * Pass 6  AAR-triage (aar)
 *
 * Section kan väljas via ?section=idt (default idt).
 */

const PHASE_LABEL: Record<string, string> = {
  idle: "Awaiting session",
  prepare: "Preparation in progress",
  "check-in": "Check-in",
  preflight: "Preflight & Play",
  exercise: "Exercise in progress",
  aar: "After Action Review",
  ended: "Session ended",
};

export default function DukShell() {
  const [searchParams] = useSearchParams();
  const section = (searchParams.get("section") ?? "idt") as SessionSection;
  const { session, loading } = useSession(section);

  // Fjärr-driven phase-transition. OK och Back är de enda knappar som
  // ändrar phase på duken. Övriga knappar (left/right) är reserverade
  // för per-fas-navigering (AAR-karusell etc).
  const handleRemote = useCallback(
    (event: RemoteEvent) => {
      if (!session) return;
      const phase = session.phase;
      if (event === "ok") {
        if (phase === "check-in") void setPhase(session.id, "preflight");
        else if (phase === "preflight") void setPhase(session.id, "exercise");
      } else if (event === "back") {
        if (phase === "preflight") void setPhase(session.id, "check-in");
      }
    },
    [session],
  );
  useRemoteControl(handleRemote);

  const phase = session?.phase ?? "idle";

  // The lane_assignments table uses the same section codes as sessions
  // after the align-section-naming migration — safe to cast.
  const laneSection = section as unknown as LaneSection;

  const currentExercise = session?.exercise_list[session.current_exercise_index] ?? null;
  const exerciseNumber = (session?.current_exercise_index ?? 0) + 1;
  const totalExercises = session?.exercise_list.length ?? 0;

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden flex">
      {loading && (
        <PlaceholderScreen section={section} text="Connecting…" />
      )}

      {!loading && phase === "check-in" && (
        <BangridDuk section={laneSection} />
      )}

      {!loading && phase === "preflight" && (
        <KriterieDuk
          exercise={currentExercise}
          exerciseNumber={exerciseNumber}
          totalExercises={totalExercises}
          awaitingExercise={!currentExercise}
        />
      )}

      {!loading && phase !== "check-in" && phase !== "preflight" && (
        <PlaceholderScreen
          section={section}
          text={PHASE_LABEL[phase]}
          subline={
            session && session.exercise_list.length > 0
              ? `Exercise ${exerciseNumber} / ${totalExercises}`
              : undefined
          }
          hint={
            phase === "idle"
              ? "Open /wizard or /tablet to start a session."
              : `Pass ${phaseToBuiltInPass(phase)} bygger denna vy.`
          }
        />
      )}

      <RemoteOverlay position="bottom-right" />
    </div>
  );
}

function phaseToBuiltInPass(phase: string): string {
  switch (phase) {
    case "prepare":
      return "2";
    case "exercise":
      return "4";
    case "aar":
      return "6";
    case "ended":
      return "7";
    default:
      return "0";
  }
}

function PlaceholderScreen({
  section,
  text,
  subline,
  hint,
}: {
  section: string;
  text: string;
  subline?: string;
  hint?: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-12">
      <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">
        Projector · {section.toUpperCase()}
      </div>
      <div className="text-6xl font-light mb-4">{text}</div>
      {subline && (
        <div className="text-sm text-white/50 font-mono mb-6">{subline}</div>
      )}
      {hint && (
        <div className="mt-8 text-xs text-white/30 max-w-md">{hint}</div>
      )}
    </div>
  );
}
