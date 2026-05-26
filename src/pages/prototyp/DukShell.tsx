import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { RemoteOverlay } from "@/components/prototyp/RemoteOverlay";
import { BangridDuk } from "@/components/prototyp/BangridDuk";
import { KriterieDuk } from "@/components/prototyp/KriterieDuk";
import { SimulationDuk } from "@/components/prototyp/SimulationDuk";
import { AARDuk } from "@/components/prototyp/AARDuk";
import { useRemoteControl, type RemoteEvent } from "@/hooks/useRemoteControl";
import { supabase } from "@/integrations/supabase/client";
import {
  setPhase,
  toggleLaneUi,
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
 * Pass 4  simulering-placeholder (exercise) + Lane UI toggle
 * Pass 6  AAR-karusell (aar)
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

  // AAR carousel index — lokalt state, en duk-pubblik. Spår 04:s
  // karusell ska vara cirkulär; modulo görs i AARDuk:n.
  const [aarIndex, setAarIndex] = useState(0);

  // Reset karusellen när phase byter till AAR (instruktör börjar om).
  useEffect(() => {
    if (session?.phase === "aar") setAarIndex(0);
  }, [session?.phase, session?.current_exercise_index]);

  // Avancera till nästa övning (eller avsluta) när OK trycks i AAR.
  const advanceFromAAR = useCallback(async () => {
    if (!session) return;
    const next = session.current_exercise_index + 1;
    if (next < session.exercise_list.length) {
      await supabase
        .from("sessions")
        .update({ current_exercise_index: next, phase: "preflight" })
        .eq("id", session.id);
    } else {
      await setPhase(session.id, "ended");
    }
  }, [session]);

  // Fjärr-driven phase-transition + per-fas-overrides.
  // Grammatik per [helhetsprototyp/plan.md §4 + spår 04:s karusell]:
  //   OK    bekräfta / nästa
  //   Back  ett steg bakåt
  //   ▲ ▼   browse — i exercise-fasen återanvänds som Lane UI toggle
  //   ◀ ▶   karusell (AAR-fasen — cirkulär mellan skyttar)
  const handleRemote = useCallback(
    (event: RemoteEvent) => {
      if (!session) return;
      const phase = session.phase;
      if (event === "ok") {
        if (phase === "check-in") void setPhase(session.id, "preflight");
        else if (phase === "preflight") void setPhase(session.id, "exercise");
        else if (phase === "exercise") void setPhase(session.id, "aar");
        else if (phase === "aar") void advanceFromAAR();
      } else if (event === "back") {
        if (phase === "preflight") void setPhase(session.id, "check-in");
      } else if (event === "up") {
        if (phase === "exercise") void toggleLaneUi(session.id, true);
      } else if (event === "down") {
        if (phase === "exercise") void toggleLaneUi(session.id, false);
      } else if (event === "left") {
        if (phase === "aar") setAarIndex((i) => i - 1); // AARDuk clampar cirkulärt
      } else if (event === "right") {
        if (phase === "aar") setAarIndex((i) => i + 1);
      }
    },
    [session, advanceFromAAR],
  );
  useRemoteControl(handleRemote);

  // Auto-advance from exercise → AAR when timer hits 0 (callback from
  // SimulationDuk). Stable callback so SimulationDuk doesn't re-trigger
  // on every parent render.
  const handleExerciseEnd = useCallback(() => {
    if (session && session.phase === "exercise") {
      void setPhase(session.id, "aar");
    }
  }, [session]);

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

      {!loading && phase === "exercise" && (
        <SimulationDuk
          exercise={currentExercise}
          laneUiVisible={session?.lane_ui_visible ?? false}
          section={section}
          onEnd={handleExerciseEnd}
        />
      )}

      {!loading && phase === "aar" && (
        <AARDuk
          exercise={currentExercise}
          section={section}
          currentIndex={aarIndex}
        />
      )}

      {!loading && phase !== "check-in" && phase !== "preflight" && phase !== "exercise" && phase !== "aar" && (
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
