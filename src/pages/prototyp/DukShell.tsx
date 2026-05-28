import { useCallback, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { RemoteOverlay } from "@/components/prototyp/RemoteOverlay";
import { BangridDuk } from "@/components/prototyp/BangridDuk";
import { KriterieDuk } from "@/components/prototyp/KriterieDuk";
import { SimulationDuk } from "@/components/prototyp/SimulationDuk";
import { AARDuk } from "@/components/prototyp/AARDuk";
import { SelectExerciseDuk } from "@/components/prototyp/SelectExerciseDuk";
import { StartConfirmOverlay } from "@/components/prototyp/StartConfirmOverlay";
import { useRemoteControl, type RemoteEvent } from "@/hooks/useRemoteControl";
import { supabase } from "@/integrations/supabase/client";
import {
  setPhase,
  pickStartExercise,
  type Section as SessionSection,
} from "@/services/sessionService";
import {
  fetchAllLanes,
  type LaneAssignment,
  type Section as LaneSection,
} from "@/services/assignmentService";
import { subscribeLaneAssignments, unsubscribe } from "@/services/realtimeService";
import {
  deriveAlerts,
  type ReadinessStatus,
} from "@/services/readinessService";

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
  "select-exercise": "Choose starting exercise",
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

  // AAR-läge — split-view per [beslut 2026-05-28] istället för karusell.
  // focusIndex pekar ut vald skytt (cirkulärt clampad i AARDuk).
  // zoomed = hero-vy för djupare analys av en skytt.
  const [aarFocus, setAarFocus] = useState(0);
  const [aarZoom, setAarZoom] = useState(false);

  // Select-exercise picker highlight — lokalt state (Q3 = A).
  // Resettas till 0 när vi går in i select-exercise-fasen.
  const [pickIndex, setPickIndex] = useState(0);
  useEffect(() => {
    if (session?.phase === "select-exercise") setPickIndex(0);
  }, [session?.phase]);

  // Check-in readiness: prenumerera på lanes för att kunna beräkna
  // aggregat-status och visa confirm-overlay om OK trycks med
  // ej-all-gröna lanes.
  const laneSectionEarly = section as unknown as LaneSection;
  const [lanes, setLanes] = useState<LaneAssignment[]>([]);
  useEffect(() => {
    void fetchAllLanes(laneSectionEarly).then(setLanes);
    const channel = subscribeLaneAssignments(laneSectionEarly, setLanes);
    return () => unsubscribe(channel);
  }, [laneSectionEarly]);

  const occupiedLanes = useMemo(
    () =>
      lanes
        .filter((l) => l.status === "occupied")
        .map((l) => ({
          lane_number: l.lane_number,
          weapon_status: (l.weapon_status ?? "na") as ReadinessStatus,
          battery_status: (l.battery_status ?? "na") as ReadinessStatus,
          ammo_status: (l.ammo_status ?? "na") as ReadinessStatus,
          comms_status: (l.comms_status ?? "na") as ReadinessStatus,
        })),
    [lanes],
  );
  const readinessAlerts = useMemo(() => deriveAlerts(occupiedLanes), [occupiedLanes]);
  const allReady = occupiedLanes.length > 0 && readinessAlerts.length === 0;
  const readyCount = occupiedLanes.length - new Set(
    readinessAlerts.flatMap((a) => a.affectedLanes),
  ).size;

  // Confirm overlay visibility — endast i check-in när någon lane är non-ok.
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Stäng confirm:en så fort phase ändras bort från check-in (t.ex. om
  // någon annan driver via /wizard medan overlayen är öppen).
  useEffect(() => {
    if (session?.phase !== "check-in") setConfirmOpen(false);
  }, [session?.phase]);

  // Reset focus + zoom när phase byter till AAR eller övning byts.
  useEffect(() => {
    if (session?.phase === "aar") {
      setAarFocus(0);
      setAarZoom(false);
    }
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
  // Grammatik per [helhetsprototyp/plan.md §4 + beslut 2026-05-28]:
  //   OK       bekräfta / nästa / zoom-toggle
  //   HoldOK   commit-actions (i AAR = nästa övning)
  //   Back     ett steg bakåt / avsluta zoom
  //   ▲ ▼     browse-listor (välj övning) — Lane UI-toggle utgår,
  //            duken visar nu Lane UI permanent under exercise
  //   ◀ ▶     navigera (AAR = flytta selection mellan skyttar)
  const handleRemote = useCallback(
    (event: RemoteEvent) => {
      if (!session) return;
      const phase = session.phase;
      const listLen = session.exercise_list.length;
      if (event === "ok") {
        if (phase === "select-exercise") {
          // Picker confirm: skriv index till DB, gå till check-in.
          if (listLen > 0) {
            const safe = Math.max(0, Math.min(pickIndex, listLen - 1));
            void pickStartExercise(session.id, safe);
          }
        }
        else if (phase === "check-in") {
          if (confirmOpen) {
            setConfirmOpen(false);
            void setPhase(session.id, "preflight");
          } else if (allReady) {
            void setPhase(session.id, "preflight");
          } else if (occupiedLanes.length > 0) {
            setConfirmOpen(true);
          }
        }
        else if (phase === "preflight") void setPhase(session.id, "exercise");
        else if (phase === "exercise") void setPhase(session.id, "aar");
        else if (phase === "aar") {
          // OK togglar zoom in/ut. Nästa övning ligger på HoldOK.
          setAarZoom((z) => !z);
        }
      } else if (event === "holdOk") {
        // Commit-action: i AAR = nästa övning eller avsluta.
        if (phase === "aar") void advanceFromAAR();
      } else if (event === "back") {
        if (confirmOpen) {
          setConfirmOpen(false);
        } else if (phase === "preflight") {
          void setPhase(session.id, "check-in");
        } else if (phase === "aar" && aarZoom) {
          setAarZoom(false);
        }
      } else if (event === "left") {
        if (phase === "aar") setAarFocus((i) => i - 1); // cirkulärt clamp i AARDuk
        else if (phase === "select-exercise") {
          setPickIndex((i) => Math.max(0, i - 1));
        }
      } else if (event === "right") {
        if (phase === "aar") setAarFocus((i) => i + 1);
        else if (phase === "select-exercise") {
          setPickIndex((i) => Math.min(listLen - 1, i + 1));
        }
      }
      // ▲ ▼ ignoreras i nya gränssnittet — Lane UI är permanent under
      // exercise och AAR har inga browse-listor.
    },
    [session, advanceFromAAR, allReady, confirmOpen, occupiedLanes.length, pickIndex, aarZoom],
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
  const laneSection = laneSectionEarly;

  const currentExercise = session?.exercise_list[session.current_exercise_index] ?? null;
  const exerciseNumber = (session?.current_exercise_index ?? 0) + 1;
  const totalExercises = session?.exercise_list.length ?? 0;

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden flex">
      {loading && (
        <PlaceholderScreen section={section} text="Connecting…" />
      )}

      {!loading && phase === "select-exercise" && (
        <SelectExerciseDuk
          exercises={session?.exercise_list ?? []}
          selectedIndex={pickIndex}
        />
      )}

      {!loading && phase === "check-in" && (
        <BangridDuk section={laneSection} exercise={currentExercise} lanes={lanes} />
      )}

      {phase === "check-in" && confirmOpen && (
        <StartConfirmOverlay
          alerts={readinessAlerts}
          laneCount={occupiedLanes.length}
          readyCount={readyCount}
        />
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
          section={section}
          onEnd={handleExerciseEnd}
        />
      )}

      {!loading && phase === "aar" && (
        <AARDuk
          exercise={currentExercise}
          section={section}
          focusIndex={aarFocus}
          zoomed={aarZoom}
        />
      )}

      {!loading && phase !== "select-exercise" && phase !== "check-in" && phase !== "preflight" && phase !== "exercise" && phase !== "aar" && (
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
