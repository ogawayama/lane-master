import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { fetchActiveGearAssignments, type ActiveGearAssignment } from "@/services/qm360Service";

const THEME_HSL = "28 95% 58%";

export default function Qm360Lanes() {
  const [items, setItems] = useState<ActiveGearAssignment[]>([]);

  useEffect(() => {
    fetchActiveGearAssignments().then(setItems);
    const refresh = () => fetchActiveGearAssignments().then(setItems);
    const ch = supabase
      .channel("qm360-assignments")
      .on("postgres_changes", { event: "*", schema: "public", table: "qm360_assignments" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "qm360_gear" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const themeStyle = { ["--primary" as string]: THEME_HSL, ["--ring" as string]: THEME_HSL } as React.CSSProperties;

  return (
    <div className="flex min-h-screen flex-col p-8" style={themeStyle}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <span className="font-bold tracking-wide text-primary text-4xl font-sans">QM 360 — GEAR PICKUP</span>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatus />
          <span className="text-sm text-muted-foreground font-['Share_Tech_Mono']">{items.length} ACTIVE</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Package className="h-12 w-12 opacity-30" />
            <div className="text-lg">No gear assigned yet</div>
            <div className="text-sm opacity-70">Scan an RFID tag to begin</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full max-w-7xl">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative flex flex-col rounded-2xl border border-accent/60 bg-card p-6 shadow-[0_0_30px_-5px_hsl(var(--accent)/0.2)]"
              >
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1">Welcome</div>
                <div className="text-2xl font-bold text-foreground">{item.name}</div>

                <div className="mt-5 text-sm uppercase tracking-widest text-muted-foreground">
                  Pick up your gear:
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3">
                    <span className="text-sm font-semibold text-muted-foreground">PDD</span>
                    <span className="text-2xl font-bold text-primary font-['Share_Tech_Mono']">
                      {String(item.pdd_number).padStart(3, "0")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3">
                    <span className="text-sm font-semibold text-muted-foreground">SAT</span>
                    <span className="text-2xl font-bold text-primary font-['Share_Tech_Mono']">
                      {String(item.sat_number).padStart(3, "0")}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-xs uppercase tracking-widest text-accent">Active</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
