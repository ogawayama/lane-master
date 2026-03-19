import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { LaneCard } from "@/components/LaneCard";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import {
  fetchAllLanes,
  type LaneAssignment } from
"@/services/assignmentService";
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
          <span className="font-bold tracking-wide text-primary text-4xl font-sans">
            FIND YOUR LANE
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
      








      

      {/* Lane cards */}
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-5 gap-5 w-full max-w-7xl">
          {lanes.map((lane) =>
          <LaneCard key={lane.lane_number} lane={lane} />
          )}
        </div>
      </div>
    </div>);

}