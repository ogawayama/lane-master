import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getCurrentSession,
  type SessionRow,
  type Section,
} from "@/services/sessionService";

/**
 * Helhetsprototyp — useSession-hook (Pass 0).
 *
 * Prenumererar på den aktiva sessionen för en given section via
 * Supabase realtime. Driver /duk, /tablet, /wizard så alla tre ser
 * samma state samtidigt.
 *
 * Returnerar `null` medan loading och om ingen session finns.
 */
export function useSession(section: Section): {
  session: SessionRow | null;
  loading: boolean;
} {
  const [session, setSession] = useState<SessionRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const initial = await getCurrentSession(section);
      if (cancelled) return;
      setSession(initial);
      setLoading(false);
    })();

    // Realtime: lyssna på alla sessions-ändringar för denna section.
    // Vi refetchar enklast vid varje event — billigt eftersom det är
    // ett enda row-svar.
    const channel = supabase
      .channel(`sessions:${section}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `section=eq.${section}` },
        async () => {
          const fresh = await getCurrentSession(section);
          if (!cancelled) setSession(fresh);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [section]);

  return { session, loading };
}
