import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { LaneCard } from "@/components/LaneCard";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import {
  fetchAllLanes,
  type LaneAssignment,
} from "@/services/assignmentService";
import { subscribeLaneAssignments, unsubscribe } from "@/services/realtimeService";

export default function LaneOverview() {
  const [lanes, setLanes] = useState<LaneAssignment[]>([]);

  useEffect(() => {
    // Initial fetch
    fetchAllLanes().then(setLanes);

    // Subscribe to realtime updates
    const channel = subscribeLaneAssignments(setLanes);
    return () => unsubscribe(channel);
  }, []);

  const occupiedCount = lanes.filter((l) => l.status === "occupied").length;
  const allOccupied = occupiedCount === 5;

  return (
    <div className="flex min-h-screen flex-col p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold tracking-wide text-primary font-['Share_Tech_Mono']">
            RANGE CONTROL
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatus />
          <span className="text-sm text-muted-foreground font-['Share_Tech_Mono']">
            {occupiedCount}/5 ACTIVE
          </span>
        </div>
      </div>

      {/* Status heading */}
      <motion.h1
        key={allOccupied ? "full" : "waiting"}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-4xl md:text-5xl font-bold text-center mb-10 ${
          allOccupied ? "text-primary" : "text-foreground"
        }`}
      >
        {allOccupied ? "All Lanes Assigned" : "Waiting for Users"}
      </motion.h1>

      {/* Lane cards */}
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-5 gap-5 w-full max-w-7xl">
          {lanes.map((lane) => (
            <LaneCard key={lane.lane_number} lane={lane} />
          ))}
        </div>
      </div>
    </div>
  );
}
