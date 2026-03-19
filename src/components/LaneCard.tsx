import { motion } from "framer-motion";
import type { LaneAssignment } from "@/services/assignmentService";
import { Crosshair, Shield } from "lucide-react";

interface LaneCardProps {
  lane: LaneAssignment;
}

export function LaneCard({ lane }: LaneCardProps) {
  const isOccupied = lane.status === "occupied";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`relative flex flex-col items-center rounded-2xl border p-6 min-h-[320px] w-full transition-all duration-500 ${
        isOccupied
          ? "border-accent/60 bg-card shadow-[0_0_30px_-5px_hsl(var(--accent)/0.2)]"
          : "border-border bg-card/50"
      }`}
    >
      {/* Active indicator line */}
      {isOccupied && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute top-0 left-4 right-4 h-1 rounded-b-full bg-accent"
        />
      )}

      {/* Lane number */}
      <div
        className={`text-5xl font-bold font-['Share_Tech_Mono'] ${
          isOccupied ? "text-primary" : "text-muted-foreground/40"
        }`}
      >
        {lane.lane_number}
      </div>

      <div className="mt-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Lane
      </div>

      {isOccupied ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-6 flex flex-col items-center gap-3 text-center"
        >
          {/* User info */}
          <div>
            <div className="text-2xl font-bold text-foreground">
              {lane.first_name}
            </div>
            {lane.last_name && (
              <div className="text-sm text-muted-foreground">{lane.last_name}</div>
            )}
          </div>

          {/* Weapon info */}
          <div className="mt-2 flex flex-col items-center gap-1 rounded-xl border border-border bg-secondary/50 px-4 py-3 w-full">
            <div className="flex items-center gap-2 text-primary">
              <Crosshair className="h-4 w-4" />
              <span className="font-semibold text-sm">{lane.weapon_name}</span>
            </div>
            <span className="mt-1 inline-flex items-center rounded-full border border-purple-500/30 bg-purple-600/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-400">{lane.weapon_type}</span>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-accent">Active</span>
          </div>
        </motion.div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <Shield className="h-8 w-8 text-muted-foreground/20" />
          <div className="text-sm font-medium text-muted-foreground/50">Empty</div>
          <div className="text-xs text-muted-foreground/30">Waiting for assignment</div>
        </div>
      )}
    </motion.div>
  );
}
