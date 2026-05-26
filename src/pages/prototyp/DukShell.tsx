import { useSearchParams } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { RemoteOverlay } from "@/components/prototyp/RemoteOverlay";
import { useRemoteControl } from "@/hooks/useRemoteControl";
import type { Section } from "@/services/sessionService";

/**
 * Helhetsprototyp — DukShell (Pass 0).
 *
 * Detta är projektorduken — full-screen, "biograf"-språk per
 * helhetsprototyp/plan.md §3. I Pass 0 är den nästan tom: visar
 * vilken fas vi är i och bekräftar att den lyssnar på fjärren.
 *
 * Pass 1 lägger till bangrid (check-in).
 * Pass 3 lägger till kriterieskärm (preflight).
 * Pass 4 lägger till simulering-placeholder (exercise).
 * Pass 6 lägger till AAR-triage (aar).
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
  const section = (searchParams.get("section") ?? "idt") as Section;
  const { session, loading } = useSession(section);

  // Pass 0: just confirm the remote is wired. Real handlers land in
  // Pass 1+ when each phase has actual interaction.
  useRemoteControl();

  return (
    <div className="fixed inset-0 bg-black text-white flex items-center justify-center overflow-hidden">
      {/* Pass 0 placeholder content — replaced phase-by-phase later */}
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">
          Projector · {section.toUpperCase()}
        </div>
        <div className="text-6xl font-light mb-6">
          {loading ? "…" : PHASE_LABEL[session?.phase ?? "idle"]}
        </div>
        {session && (
          <div className="text-sm text-white/40 font-mono">
            {session.exercise_list.length > 0 && (
              <span>
                Exercise {session.current_exercise_index + 1} / {session.exercise_list.length}
              </span>
            )}
          </div>
        )}
        <div className="mt-12 text-xs text-white/30 max-w-md mx-auto">
          Helhetsprototyp · Pass 0 skelett. Innehåll per fas byggs i Pass 1–6.
          Öppna <code>/tablet?section={section}</code> eller{" "}
          <code>/wizard?section={section}</code> i ett annat fönster för att
          driva sessionen.
        </div>
      </div>
      <RemoteOverlay position="bottom-right" />
    </div>
  );
}
