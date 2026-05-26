import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Helhetsprototyp — useWeapons (Pass 2).
 *
 * Läser weapons-tabellen + prenumererar på ändringar. Mappar
 * is_assigned → sensor-status-proxy (per spår 01:s Jonas-underlag:
 * dioder/sensorer finns redan på vapnen — vi har bara inte realtime
 * sensor-feed än, så vi använder DB-status som proxy).
 *
 * "ready" = oanvänt vapen (tillgängligt för tilldelning)
 * "in_use" = utlånat till en skytt (upptaget)
 *
 * När riktig sensordata kopplas in: utöka med batteri-procent, comms-OK,
 * etc. Returnera samma form { id, name, type, status } + extra fält.
 */

export interface WeaponStatus {
  weapon_id: number;
  weapon_name: string;
  weapon_type: string;
  status: "ready" | "in_use";
}

export function useWeapons(): {
  weapons: WeaponStatus[];
  availableTypes: Set<string>;
  loading: boolean;
} {
  const [weapons, setWeapons] = useState<WeaponStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function refetch() {
      const { data, error } = await supabase
        .from("weapons")
        .select("weapon_id, weapon_name, weapon_type, is_assigned")
        .order("weapon_id", { ascending: true });
      if (cancelled || error || !data) return;
      setWeapons(
        data.map((w) => ({
          weapon_id: w.weapon_id,
          weapon_name: w.weapon_name,
          weapon_type: w.weapon_type,
          status: w.is_assigned ? "in_use" : "ready",
        })),
      );
      setLoading(false);
    }

    void refetch();

    const channel = supabase
      .channel("weapons-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "weapons" },
        () => void refetch(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  const availableTypes = new Set(
    weapons.filter((w) => w.status === "ready").map((w) => w.weapon_type),
  );

  return { weapons, availableTypes, loading };
}
