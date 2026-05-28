import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Box, Card, Stack, Typography } from "@mui/material";
import { Shield, Inventory } from "@mui/icons-material";
import { supabase } from "@/integrations/supabase/client";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { fetchActiveGearAssignments, type ActiveGearAssignment } from "@/services/qm360Service";

/**
 * Qm360Lanes — M3-omskrivning 2026-05-28. QM360 gear-pickup-vy.
 */

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

  return (
    <Stack sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary", p: 4 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Shield sx={{ color: "warning.main", fontSize: 32 }} />
          <Typography sx={{ fontWeight: 700, color: "warning.main", fontSize: 32, letterSpacing: "0.05em" }}>
            QM 360 — GEAR PICKUP
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <ConnectionStatus />
          <Typography sx={{ fontSize: 14, color: "text.secondary", fontFamily: '"Roboto Mono", monospace' }}>
            {items.length} ACTIVE
          </Typography>
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {items.length === 0 ? (
          <Stack spacing={1.5} sx={{ alignItems: "center", color: "text.secondary" }}>
            <Inventory sx={{ fontSize: 48, opacity: 0.3 }} />
            <Typography sx={{ fontSize: 18 }}>No gear assigned yet</Typography>
            <Typography sx={{ fontSize: 14, opacity: 0.7 }}>Scan an RFID tag to begin</Typography>
          </Stack>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)", xl: "repeat(4, 1fr)" },
              gap: 2.5,
              width: "100%",
              maxWidth: 1400,
            }}
          >
            {items.map((item) => (
              <Card
                key={item.id}
                component={motion.div}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                sx={{
                  p: 3,
                  bgcolor: "var(--mui-palette-m3-surfaceContainerLow)",
                  border: 1,
                  borderColor: "warning.main",
                  borderRadius: "16px",
                }}
              >
                <Typography sx={{ fontSize: 11, letterSpacing: "0.3em", color: "text.secondary", textTransform: "uppercase", mb: 0.5 }}>
                  Welcome
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 700 }}>{item.name}</Typography>
                <Typography sx={{ mt: 2.5, fontSize: 12, letterSpacing: "0.2em", color: "text.secondary", textTransform: "uppercase" }}>
                  Pick up your gear:
                </Typography>
                <Stack spacing={1} sx={{ mt: 1.5 }}>
                  <GearRow label="PDD" value={String(item.pdd_number).padStart(3, "0")} />
                  <GearRow label="SAT" value={String(item.sat_number).padStart(3, "0")} />
                </Stack>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "warning.main", animation: "pulse 1.4s ease-in-out infinite", "@keyframes pulse": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.4 } } }} />
                  <Typography sx={{ fontSize: 11, letterSpacing: "0.2em", color: "warning.main", textTransform: "uppercase" }}>
                    Active
                  </Typography>
                </Stack>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    </Stack>
  );
}

function GearRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack
      direction="row"
      sx={{
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "var(--mui-palette-m3-surfaceContainer)",
        px: 2,
        py: 1.5,
      }}
    >
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.secondary" }}>{label}</Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "warning.main", fontFamily: '"Roboto Mono", monospace' }}>
        {value}
      </Typography>
    </Stack>
  );
}
