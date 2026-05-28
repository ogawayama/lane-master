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
        className="max-w-4xl w-full rounded-3xl border border-status-warning/30 bg-zinc-950 p-12 text-white"
      >
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-7 w-7 text-status-warning" />
          <span className="text-[12px] uppercase tracking-[0.3em] text-status-warning">
            Confirmation
          </span>
        </div>
        <h2 className="text-4xl font-light leading-tight mb-8">
          Start with {laneCount - readyCount} lane{laneCount - readyCount === 1 ? "" : "s"} not ready?
        </h2>

        <div className="space-y-2 mb-10">
          {alerts.map((a) => (
            <div
              key={`${a.indicator}-${a.severity}`}
              className={`flex items-baseline gap-3 rounded-lg border px-5 py-3.5 ${
                a.severity === "critical"
                  ? "border-status-attention/30 bg-status-attention/5"
                  : "border-status-warning/30 bg-status-warning/5"
              }`}
            >
              <span
                className={`text-[11px] uppercase tracking-[0.3em] shrink-0 ${
                  a.severity === "critical" ? "text-status-attention" : "text-status-warning"
                }`}
              >
                {a.severity}
              </span>
              <span className="text-base flex-1">{a.label}</span>
              <span className="text-xs text-white/50 font-mono">
                Lane {a.affectedLanes.join(", ")}
              </span>
            </div>
          ))}
        </div>

        {/* Större fjärr-affordances — matchar Bangrid:s NEXT-stil, läsbara
            på 10 fot. (UX-review 2026-05-28: tidigare hint-rad var inte
            "duk-storlek".) */}
        <div className="flex items-center justify-center gap-6 text-white/70">
          <div className="flex items-center gap-3 rounded-xl border border-white/25 bg-white/[0.03] px-5 py-3">
            <span className="inline-flex items-center justify-center h-8 w-12 rounded border border-white/40 text-xs font-mono">
              BACK
            </span>
            <span className="text-sm uppercase tracking-[0.3em]">Cancel</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-status-warning/50 bg-status-warning/10 px-5 py-3 text-status-warning">
            <span className="inline-flex items-center justify-center h-8 w-12 rounded border border-status-warning/60 text-xs font-mono">
              OK
            </span>
            <span className="text-sm uppercase tracking-[0.3em]">Start anyway</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
