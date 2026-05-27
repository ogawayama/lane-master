import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { DerivedAlert } from "@/services/readinessService";

/**
 * Helhetsprototyp — StartConfirmOverlay (Pass 1.5).
 *
 * Visas över BangridDuk när instruktören trycker OK med ej-all-gröna
 * lanes. Lista problemen + två fjärr-affordances (OK för att starta
 * ändå, Back för att avbryta).
 *
 * Per user-beslut 2026-05-26 (Q1 = B): inte hård gräns, inte glidande.
 * Instruktören får sista ordet men måste bekräfta att hen sett
 * avvikelserna.
 */

export function StartConfirmOverlay({
  alerts,
  laneCount,
  readyCount,
}: {
  alerts: DerivedAlert[];
  laneCount: number;
  readyCount: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-12"
    >
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-2xl w-full rounded-3xl border border-amber-500/30 bg-zinc-950 p-10 text-white"
      >
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
          <span className="text-[11px] uppercase tracking-[0.3em] text-amber-400">
            Confirmation
          </span>
        </div>
        <h2 className="text-3xl font-light leading-tight mb-6">
          Start with {laneCount - readyCount} lane{laneCount - readyCount === 1 ? "" : "s"} not ready?
        </h2>

        <div className="space-y-2 mb-8">
          {alerts.map((a) => (
            <div
              key={`${a.indicator}-${a.severity}`}
              className={`flex items-baseline gap-3 rounded-lg border px-4 py-3 ${
                a.severity === "critical"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-amber-400/30 bg-amber-400/5"
              }`}
            >
              <span
                className={`text-[10px] uppercase tracking-[0.3em] shrink-0 ${
                  a.severity === "critical" ? "text-red-400" : "text-amber-400"
                }`}
              >
                {a.severity}
              </span>
              <span className="text-sm flex-1">{a.label}</span>
              <span className="text-[11px] text-white/50 font-mono">
                Lane {a.affectedLanes.join(", ")}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-8 text-white/60 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-7 w-11 rounded border border-white/30 text-[10px] font-mono">
              BACK
            </span>
            <span className="text-xs uppercase tracking-[0.3em]">Cancel</span>
          </div>
          <span className="text-white/20">·</span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-7 w-11 rounded border border-amber-400/60 text-[10px] font-mono text-amber-300">
              OK
            </span>
            <span className="text-xs uppercase tracking-[0.3em]">Start anyway</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
