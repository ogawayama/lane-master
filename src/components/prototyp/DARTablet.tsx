import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDARSignals } from "@/hooks/useDARSignals";
import type { DarSignal, DarStatus } from "@/services/darService";
import type { Section } from "@/services/sessionService";

/**
 * Helhetsprototyp — DARTablet (Pass 5).
 *
 * Instruktörens privata triage-yta under exercise-fasen. Per
 * [spår 03 spårkort §Idén] finns fyra UI-designspår — vi bygger de
 * tre primära (A/B/C) och låter instruktören växla mellan dem under
 * test:
 *
 *   B  Banlayout: rutnät som speglar banorna, trafikljus per bana
 *   A  Kölogik:   tre kolumner (röd / gul / grön), arbeta uppifrån
 *   C  Fokuskort: ett kritiskt fall i taget, systemet bestämmer
 *
 * Default: B (spatialt intuitiv, låg kognitiv last per Designs not).
 *
 * Designspråk: "kontrollrum" — tät, status-bärande. Visas BARA på
 * instruktörens device, ALDRIG på duken.
 */

type LayoutVariant = "B" | "A" | "C";

const STATUS_RANK: Record<DarStatus, number> = { red: 0, yellow: 1, green: 2 };

// Semantiska tokens — definierade i index.css (status-attention/-warning/
// -success). Tokens delas med BangridDuk/AARDuk så hela prototypens
// triage-färgsystem ändras via en token-uppdatering.
const STATUS_COLOR: Record<DarStatus, { bg: string; ring: string; text: string }> = {
  red: { bg: "bg-status-attention", ring: "ring-status-attention/60", text: "text-status-attention" },
  yellow: { bg: "bg-status-warning", ring: "ring-status-warning/60", text: "text-status-warning" },
  green: { bg: "bg-status-success", ring: "ring-status-success/40", text: "text-status-success" },
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

export function DARTablet({
  sessionId,
  section,
}: {
  sessionId: string;
  section: Section;
}) {
  const [variant, setVariant] = useState<LayoutVariant>("B");
  const { byLane, loading } = useDARSignals(sessionId);

  // Read lanes + occupant info from existing lane_assignments-table.
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

  const merged = lanes.map((l) => ({
    ...l,
    signal: byLane.get(l.lane_number) ?? null,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <header className="max-w-4xl mx-auto mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Tablet · {section.toUpperCase()} · DAR triage
          </div>
          <div className="text-lg font-semibold mt-0.5">Live signals</div>
        </div>
        <LayoutSelector value={variant} onChange={setVariant} />
      </header>

      <div className="max-w-4xl mx-auto">
        {loading && (
          <div className="text-sm text-muted-foreground">Connecting…</div>
        )}
        {!loading && variant === "B" && <LayoutB lanes={merged} />}
        {!loading && variant === "A" && <LayoutA lanes={merged} />}
        {!loading && variant === "C" && <LayoutC lanes={merged} />}
      </div>

      <div className="max-w-4xl mx-auto mt-6 text-[10px] uppercase tracking-[0.3em] text-muted-foreground text-center">
        Triage stays on this tablet · not shown on the projector
      </div>
    </div>
  );
}

function LayoutSelector({
  value,
  onChange,
}: {
  value: LayoutVariant;
  onChange: (v: LayoutVariant) => void;
}) {
  const options: LayoutVariant[] = ["B", "A", "C"];
  return (
    <div className="inline-flex rounded-md border border-border bg-card text-xs">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 transition-colors ${
            value === opt
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {opt === "B" ? "Grid" : opt === "A" ? "Queue" : "Focus"}
        </button>
      ))}
    </div>
  );
}

interface LaneRow extends LaneInfo {
  signal: DarSignal | null;
}

/** Layout B — grid that mirrors the studio's physical layout. */
function LayoutB({ lanes }: { lanes: LaneRow[] }) {
  const cols = lanes.length <= 5 ? Math.max(lanes.length, 1) : Math.ceil(lanes.length / 2);
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {lanes.map((l) => (
        <LaneTileB key={l.lane_number} lane={l} />
      ))}
    </div>
  );
}

function LaneTileB({ lane }: { lane: LaneRow }) {
  const status = lane.signal?.status;
  const colors = status ? STATUS_COLOR[status] : null;
  return (
    <div
      className={`relative aspect-square rounded-2xl border bg-card p-3 flex flex-col items-center justify-center text-center transition-all ${
        colors ? `${colors.ring} ring-2` : "border-border"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Lane
      </div>
      <div className="text-4xl font-light leading-none tabular-nums mt-0.5">
        {lane.lane_number}
      </div>
      <div className="text-xs text-muted-foreground mt-1 truncate max-w-full">
        {lane.name ?? "—"}
      </div>
      <AnimatePresence>
        {status && colors && (
          <motion.div
            key={status}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`absolute top-2 right-2 w-3 h-3 rounded-full ${colors.bg}`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** Layout A — queue, three columns (red / yellow / green). */
function LayoutA({ lanes }: { lanes: LaneRow[] }) {
  const buckets: Record<DarStatus | "none", LaneRow[]> = {
    red: [],
    yellow: [],
    green: [],
    none: [],
  };
  for (const l of lanes) {
    const s = l.signal?.status;
    if (!s) buckets.none.push(l);
    else buckets[s].push(l);
  }
  const order: { key: DarStatus; label: string }[] = [
    { key: "red", label: STATUS_LABEL.red },
    { key: "yellow", label: STATUS_LABEL.yellow },
    { key: "green", label: STATUS_LABEL.green },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {order.map(({ key, label }) => {
        const colors = STATUS_COLOR[key];
        const items = buckets[key];
        return (
          <div key={key} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${colors.bg}`} />
              <span className={`text-xs uppercase tracking-wider font-medium ${colors.text}`}>
                {label} ({items.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {items.length === 0 && (
                <div className="text-[11px] text-muted-foreground">—</div>
              )}
              {items.map((l) => (
                <div key={l.lane_number} className="rounded-lg bg-background/50 px-2 py-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-mono tabular-nums">{l.lane_number}</span>
                    <span className="text-xs text-foreground/80 truncate">
                      {l.name ?? "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {buckets.none.length > 0 && (
        <div className="col-span-3 text-[11px] text-muted-foreground text-center">
          {buckets.none.length} lane(s) without a signal yet
        </div>
      )}
    </div>
  );
}

/** Layout C — single focus card on the highest-priority lane. */
function LayoutC({ lanes }: { lanes: LaneRow[] }) {
  // Highest-priority lane: first by status (red < yellow < green), then by recency.
  const withSignals = lanes.filter((l) => l.signal !== null) as Array<
    LaneRow & { signal: DarSignal }
  >;
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
      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
        No signals yet. Waiting…
      </div>
    );
  }

  const colors = STATUS_COLOR[focus.signal.status];
  return (
    <div>
      <motion.div
        key={`${focus.lane_number}-${focus.signal.status}`}
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className={`rounded-2xl border ${colors.ring} ring-2 bg-card p-6`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-3 h-3 rounded-full ${colors.bg}`} />
          <span className={`text-[11px] uppercase tracking-[0.3em] ${colors.text}`}>
            {STATUS_LABEL[focus.signal.status]} · highest priority
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Lane
          </div>
          <div className="text-7xl font-light leading-none tabular-nums">
            {focus.lane_number}
          </div>
          <div className="text-xl text-foreground/80">{focus.name ?? "—"}</div>
        </div>
        {focus.signal.reason && (
          <div className="mt-4 text-sm text-foreground/70 italic">
            {focus.signal.reason}
          </div>
        )}
      </motion.div>

      {rest.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
            Next
          </div>
          <div className="space-y-1.5">
            {rest.map((l) => {
              const c = STATUS_COLOR[l.signal.status];
              return (
                <div
                  key={l.lane_number}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${c.bg}`} />
                  <span className="text-lg font-mono tabular-nums w-8">{l.lane_number}</span>
                  <span className="text-sm text-foreground/80 truncate flex-1">
                    {l.name ?? "—"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
