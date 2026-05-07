import { supabase } from "@/integrations/supabase/client";
import type { LaneAssignment, Section } from "./assignmentService";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function subscribeLaneAssignments(
  section: Section,
  onUpdate: (lanes: LaneAssignment[]) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`lane-assignments-${section}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "lane_assignments",
        filter: `section=eq.${section}`,
      },
      async () => {
        const { data } = await supabase
          .from("lane_assignments")
          .select("*")
          .eq("section", section)
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
