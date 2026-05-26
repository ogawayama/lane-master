import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchAllLanes,
  type LaneAssignment,
  type Section,
} from "@/services/assignmentService";
import { subscribeLaneAssignments, unsubscribe } from "@/services/realtimeService";

/**
 * Helhetsprototyp — BangridDuk (Pass 1).
 *
 * Duken under check-in-fasen. Per helhetsprototyp/plan.md §5 Pass 1 +
 * spår 02:s [Beslut 2026-05-25]: en gemensam, "celebratory" yta som
 * fylls upp i takt med att skyttar blippar in på check-in-tableten.
 *
 * Designspråk: "biograf" (per [10-feet UI §Tre UI-lager](GS-POM/spår/05)).
 * Stor, lugn, hero-känsla. Distinkt från LaneCard som är "kontrollrum".
 *
 * Datakälla: lane_assignments-tabellen (redan finns) — vi LÄSER bara.
 * Skrivning sker fortfarande från LoginScreen (RFIDSimulator).
 *
 * Öppen fråga: form på systemvarningar (per spår 02 §Öppna frågor) —
 * parkerad tills första riktiga test. Idag visar vi bara aktiv/tom.
 */

export function BangridDuk({ section }: { section: Section }) {
  const [lanes, setLanes] = useState<LaneAssignment[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void fetchAllLanes(section).then((data) => {
      setLanes(data);
      setLoaded(true);
    });
    const channel = subscribeLaneAssignments(section, setLanes);
    return () => unsubscribe(channel);
  }, [section]);

  const occupied = lanes.filter((l) => l.status === "occupied").length;
  const total = lanes.length;
  const allCheckedIn = total > 0 && occupied === total;

  // Layout: studio (≤5) → ett rad, double studio (>5) → två rader
  const cols = total <= 5 ? Math.max(total, 1) : Math.ceil(total / 2);

  return (
    <div className="flex flex-col h-full w-full p-12 text-white">
      {/* Top — section + counter + instruction */}
      <div className="flex items-baseline justify-between mb-12">
        <div>
          <div className="text-[11px] uppercase tracking-[0.4em] text-white/40 mb-2">
            Check-in · {section.replace("_", " ").toUpperCase()}
          </div>
          <h1 className="text-5xl font-light tracking-tight">
            {allCheckedIn ? "All trainees checked in" : "Waiting for check-in"}
          </h1>
        </div>
        <div className="text-right">
          <div className="text-7xl font-mono tabular-nums leading-none">
            {occupied}
            <span className="text-white/30">/{total || "–"}</span>
          </div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-white/40 mt-2">
            Checked in
          </div>
        </div>
      </div>

      {/* Lane grid — fills middle, scales to count */}
      <div className="flex-1 flex items-center justify-center">
        <div
          className="grid gap-6 w-full max-w-[1600px]"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {loaded && lanes.length === 0 && (
            <div className="col-span-full text-center text-white/30 text-xl">
              No lanes configured for this section yet.
            </div>
          )}
          {lanes.map((lane) => (
            <LaneTile key={lane.id} lane={lane} />
          ))}
        </div>
      </div>

      {/* Bottom — instruction line. Calm, non-urgent. */}
      <div className="text-center text-white/40 text-sm tracking-wide mt-12">
        {allCheckedIn
          ? "Press OK on the remote to start the exercise."
          : "Tap your RFID on the check-in tablet to take a lane."}
      </div>
    </div>
  );
}

function LaneTile({ lane }: { lane: LaneAssignment }) {
  const occupied = lane.status === "occupied";
  return (
    <motion.div
      layout
      className={`relative aspect-[3/4] rounded-2xl border flex flex-col items-center justify-center text-center overflow-hidden transition-colors duration-500 ${
        occupied
          ? "border-emerald-400/40 bg-emerald-500/5"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      {/* Lane number — always big, dims when empty */}
      <div
        className={`text-[6rem] font-light leading-none tabular-nums transition-colors duration-500 ${
          occupied ? "text-white" : "text-white/15"
        }`}
      >
        {lane.lane_number}
      </div>
      <div
        className={`text-[10px] uppercase tracking-[0.3em] mt-1 transition-colors duration-500 ${
          occupied ? "text-emerald-300/80" : "text-white/20"
        }`}
      >
        Lane
      </div>

      {/* Occupant — fades in once checked in */}
      <AnimatePresence>
        {occupied && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="absolute bottom-6 left-4 right-4 flex flex-col items-center gap-1"
          >
            <div className="text-xl font-medium truncate max-w-full">
              {lane.name ?? "Trainee"}
            </div>
            {lane.weapon_name && (
              <div className="text-xs text-white/60 truncate max-w-full">
                {lane.weapon_name}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Soft glow ring once occupied — biograf accent */}
      {occupied && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 rounded-2xl pointer-events-none shadow-[inset_0_0_60px_-20px_rgba(52,211,153,0.5)]"
        />
      )}
    </motion.div>
  );
}
