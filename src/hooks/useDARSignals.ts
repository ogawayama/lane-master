import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSignals, type DarSignal } from "@/services/darService";

/**
 * Helhetsprototyp — useDARSignals (Pass 5).
 *
 * Prenumererar på dar_signals för en given session via realtime.
 * Returnerar både listan och en Map indexerad på lane_number för
 * snabb uppslagning i UI.
 */
export function useDARSignals(sessionId: string | undefined): {
  signals: DarSignal[];
  byLane: Map<number, DarSignal>;
  loading: boolean;
} {
  const [signals, setSignals] = useState<DarSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setSignals([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function refetch() {
      const data = await getSignals(sessionId!);
      if (!cancelled) {
        setSignals(data);
        setLoading(false);
      }
    }

    void refetch();

    const channel = supabase
      .channel(`dar-signals-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dar_signals",
          filter: `session_id=eq.${sessionId}`,
        },
        () => void refetch(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const byLane = new Map(signals.map((s) => [s.lane_number, s]));

  return { signals, byLane, loading };
}
