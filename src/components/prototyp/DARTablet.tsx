import { useEffect, useState } from "react";
import {
  Box,
  Card,
  Container,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
} from "@mui/material";
import { ChevronRight } from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useDARSignals } from "@/hooks/useDARSignals";
import type { DarSignal, DarStatus } from "@/services/darService";
import type { Section } from "@/services/sessionService";

/**
 * Helhetsprototyp — DARTablet (M3-omskrivning 2026-05-28).
 *
 * Instruktörens privata triage-yta under exercise-fasen. Tre layouter
 * (B/A/C per spår 03) togglas via M3 segmented button (ToggleButtonGroup).
 * Lane-tiles som MUI Card med statusContainer-tint + outline-ring per
 * status. M3 expressive typography för lane numbers.
 */

type LayoutVariant = "B" | "A" | "C";

const STATUS_RANK: Record<DarStatus, number> = { red: 0, yellow: 1, green: 2 };

const STATUS_BG: Record<DarStatus, string> = {
  red: "var(--mui-palette-m3-statusAttentionContainer)",
  yellow: "var(--mui-palette-m3-statusWarningContainer)",
  green: "var(--mui-palette-m3-statusSuccessContainer)",
};
const STATUS_FG: Record<DarStatus, string> = {
  red: "var(--mui-palette-error-main)",
  yellow: "var(--mui-palette-warning-main)",
  green: "var(--mui-palette-success-main)",
};
const STATUS_LABEL: Record<DarStatus, string> = {
  red: "Needs follow-up",
  yellow: "Needs support",
  green: "Looking good",
};

interface LaneInfo {
  lane_number: number;
  name: string | null;
  status: string;
}

const LAYOUT_STORAGE_KEY = "dar-tablet-layout";

export function DARTablet({
  sessionId,
  section,
}: {
  sessionId: string;
  section: Section;
}) {
  // Layoutvalet persistas — komponenten unmountas varje gång fasen
  // lämnar exercise, och instruktören ska inte tappa sitt val mellan
  // övningsvarven mitt i ett test.
  const [variant, setVariant] = useState<LayoutVariant>(() => {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return stored === "A" || stored === "B" || stored === "C" ? stored : "B";
  });
  const pickVariant = (v: LayoutVariant) => {
    setVariant(v);
    localStorage.setItem(LAYOUT_STORAGE_KEY, v);
  };
  const { byLane, loading } = useDARSignals(sessionId);

  const [lanes, setLanes] = useState<LaneInfo[]>([]);
  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("lane_assignments")
      .select("lane_number,name,status")
      .eq("section", section)
      .order("lane_number")
      .then(({ data }) => {
        if (!cancelled) setLanes((data ?? []) as LaneInfo[]);
      });
    return () => {
      cancelled = true;
    };
  }, [section]);

  // Endast incheckade banor — en signal på en tom bana (namn "—") är
  // ett falsklarm som stör testet. MiniAARTablet filtrerar redan så.
  const merged = lanes
    .filter((l) => l.status === "occupied")
    .map((l) => ({ ...l, signal: byLane.get(l.lane_number) ?? null }));

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary", p: 2 }}>
      <Container maxWidth="md" sx={{ px: 0 }}>
        <Stack direction="row" sx={{ alignItems: "baseline", justifyContent: "space-between", mb: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 10, letterSpacing: "0.3em", color: "text.secondary", textTransform: "uppercase" }}>
              Tablet · {section.toUpperCase()} · DAR triage
            </Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 600, mt: 0.25 }}>
              Live signals
            </Typography>
          </Box>
          <ToggleButtonGroup
            value={variant}
            exclusive
            onChange={(_, v) => v && pickVariant(v as LayoutVariant)}
            size="small"
            sx={{ "& .MuiToggleButton-root": { borderRadius: "8px !important", px: 2, textTransform: "none", minHeight: 44 } }}
          >
            <ToggleButton value="B">Grid</ToggleButton>
            <ToggleButton value="A">Queue</ToggleButton>
            <ToggleButton value="C">Focus</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {loading && <Typography color="text.secondary">Connecting…</Typography>}
        {!loading && variant === "B" && <LayoutB lanes={merged} />}
        {!loading && variant === "A" && <LayoutA lanes={merged} />}
        {!loading && variant === "C" && <LayoutC lanes={merged} />}

        <Typography
          sx={{
            fontSize: 10,
            letterSpacing: "0.3em",
            color: "text.secondary",
            textTransform: "uppercase",
            textAlign: "center",
            mt: 4,
          }}
        >
          Triage stays on this tablet · not shown on the projector
        </Typography>
      </Container>
    </Box>
  );
}

interface LaneRow extends LaneInfo {
  signal: DarSignal | null;
}

function LayoutB({ lanes }: { lanes: LaneRow[] }) {
  const cols = lanes.length <= 5 ? Math.max(lanes.length, 1) : Math.ceil(lanes.length / 2);
  return (
    <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {lanes.map((l) => <LaneTileB key={l.lane_number} lane={l} />)}
    </Box>
  );
}

function LaneTileB({ lane }: { lane: LaneRow }) {
  const status = lane.signal?.status;
  return (
    <Card
      sx={{
        position: "relative",
        aspectRatio: "1 / 1",
        bgcolor: status ? STATUS_BG[status] : "var(--mui-palette-m3-surfaceContainerLow)",
        outline: status ? "2px solid" : "none",
        outlineColor: status ? STATUS_FG[status] : "transparent",
        outlineOffset: "-2px",
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <Typography sx={{ fontSize: 10, letterSpacing: "0.15em", color: "text.secondary", textTransform: "uppercase" }}>
        Lane
      </Typography>
      <Typography sx={{ fontSize: 32, fontWeight: 300, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        {lane.lane_number}
      </Typography>
      <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.5, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {lane.name ?? "—"}
      </Typography>
      <AnimatePresence>
        {status && (
          <motion.div
            key={status}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            style={{ position: "absolute", top: 8, right: 8, width: 12, height: 12, borderRadius: "50%", background: STATUS_FG[status] }}
          />
        )}
      </AnimatePresence>
    </Card>
  );
}

function LayoutA({ lanes }: { lanes: LaneRow[] }) {
  const buckets: Record<DarStatus | "none", LaneRow[]> = { red: [], yellow: [], green: [], none: [] };
  for (const l of lanes) {
    const s = l.signal?.status;
    if (!s) buckets.none.push(l);
    else buckets[s].push(l);
  }
  const order: { key: DarStatus }[] = [{ key: "red" }, { key: "yellow" }, { key: "green" }];

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
      {order.map(({ key }) => {
        const items = buckets[key];
        return (
          <Card key={key} sx={{ p: 1.5, bgcolor: "var(--mui-palette-m3-surfaceContainerLow)" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: STATUS_FG[key] }} />
              <Typography sx={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500, color: STATUS_FG[key] }}>
                {STATUS_LABEL[key]} ({items.length})
              </Typography>
            </Stack>
            <Stack spacing={0.75}>
              {items.length === 0 && <Typography sx={{ fontSize: 11, color: "text.secondary" }}>—</Typography>}
              {items.map((l) => (
                <Box
                  key={l.lane_number}
                  sx={{
                    borderRadius: 1,
                    bgcolor: "var(--mui-palette-m3-surfaceContainer)",
                    px: 1,
                    py: 0.75,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 1,
                  }}
                >
                  <Typography sx={{ fontSize: 14, fontFamily: '"Roboto Mono", monospace', fontVariantNumeric: "tabular-nums" }}>
                    {l.lane_number}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.name ?? "—"}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Card>
        );
      })}
      {buckets.none.length > 0 && (
        <Typography sx={{ gridColumn: "1 / -1", fontSize: 11, color: "text.secondary", textAlign: "center" }}>
          {buckets.none.length} lane(s) without a signal yet
        </Typography>
      )}
    </Box>
  );
}

function LayoutC({ lanes }: { lanes: LaneRow[] }) {
  const withSignals = lanes.filter((l) => l.signal !== null) as Array<LaneRow & { signal: DarSignal }>;
  withSignals.sort((a, b) => {
    const sa = STATUS_RANK[a.signal.status];
    const sb = STATUS_RANK[b.signal.status];
    if (sa !== sb) return sa - sb;
    return b.signal.updated_at.localeCompare(a.signal.updated_at);
  });
  const focus = withSignals[0];
  const rest = withSignals.slice(1, 4);

  if (!focus) {
    return (
      <Card sx={{ p: 6, textAlign: "center", color: "text.secondary", border: 1, borderColor: "divider", borderStyle: "dashed", bgcolor: "transparent" }}>
        No signals yet. Waiting…
      </Card>
    );
  }

  return (
    <Box>
      <motion.div
        key={`${focus.lane_number}-${focus.signal.status}`}
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <Card
          sx={{
            p: 3,
            bgcolor: STATUS_BG[focus.signal.status],
            outline: "2px solid",
            outlineColor: STATUS_FG[focus.signal.status],
            outlineOffset: "-2px",
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: STATUS_FG[focus.signal.status] }} />
            <Typography sx={{ fontSize: 11, letterSpacing: "0.3em", color: STATUS_FG[focus.signal.status], textTransform: "uppercase" }}>
              {STATUS_LABEL[focus.signal.status]} · highest priority
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "baseline" }}>
            <Typography sx={{ fontSize: 10, letterSpacing: "0.15em", color: "text.secondary", textTransform: "uppercase" }}>
              Lane
            </Typography>
            <Typography sx={{ fontSize: 64, fontWeight: 300, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
              {focus.lane_number}
            </Typography>
            <Typography sx={{ fontSize: 20, color: "text.primary" }}>{focus.name ?? "—"}</Typography>
          </Stack>
          {focus.signal.reason && (
            <Typography sx={{ mt: 2, fontSize: 14, color: "text.primary", fontStyle: "italic" }}>
              {focus.signal.reason}
            </Typography>
          )}
        </Card>
      </motion.div>

      {rest.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: 10, letterSpacing: "0.3em", color: "text.secondary", textTransform: "uppercase", mb: 1 }}>
            Next
          </Typography>
          <Stack spacing={0.75}>
            {rest.map((l) => (
              <Card
                key={l.lane_number}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 1.5,
                  py: 1,
                  bgcolor: "var(--mui-palette-m3-surfaceContainerLow)",
                }}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: STATUS_FG[l.signal.status] }} />
                <Typography sx={{ width: 32, fontSize: 18, fontFamily: '"Roboto Mono", monospace', fontVariantNumeric: "tabular-nums" }}>
                  {l.lane_number}
                </Typography>
                <Typography sx={{ fontSize: 14, color: "text.primary", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.name ?? "—"}
                </Typography>
                <ChevronRight sx={{ fontSize: 18, color: "text.secondary" }} />
              </Card>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
