import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { LaneCard } from "@/components/LaneCard";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import {
  fetchAllLanes,
  type LaneAssignment,
  type Section,
} from "@/services/assignmentService";
import { subscribeLaneAssignments, unsubscribe } from "@/services/realtimeService";

interface LaneOverviewProps {
  heading?: string;
  themeHsl?: string;
  section?: Section;
}

export default function LaneOverview({
  heading = "FIND YOUR LANE",
  themeHsl,
  section = "idt",
}: LaneOverviewProps = {}) {
  const [lanes, setLanes] = useState<LaneAssignment[]>([]);

  const themeStyle = themeHsl
    ? ({ ["--primary" as string]: themeHsl, ["--ring" as string]: themeHsl } as React.CSSProperties)
    : undefined;

  useEffect(() => {
    fetchAllLanes(section).then(setLanes);
    const channel = subscribeLaneAssignments(section, setLanes);
    return () => unsubscribe(channel);
  }, [section]);

  const occupiedCount = lanes.filter((l) => l.status === "occupied").length;

  return (
    <div className="flex min-h-screen flex-col p-8" style={themeStyle}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <span className="font-bold tracking-wide text-primary text-4xl font-sans">
            {heading}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatus />
          <span className="text-sm text-muted-foreground font-['Share_Tech_Mono']">
            {occupiedCount}/5 ACTIVE
          </span>
        </div>
      </div>

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
