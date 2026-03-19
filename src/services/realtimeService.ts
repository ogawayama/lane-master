import { supabase } from "@/integrations/supabase/client";
import type { LaneAssignment } from "./assignmentService";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function subscribeLaneAssignments(
  onUpdate: (lanes: LaneAssignment[]) => void
): RealtimeChannel {
  const channel = supabase
    .channel("lane-assignments-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "lane_assignments" },
      async () => {
        // Re-fetch all lanes on any change
        const { data } = await supabase
          .from("lane_assignments")
          .select("*")
          .order("lane_number", { ascending: true });
        if (data) onUpdate(data);
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribe(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}
