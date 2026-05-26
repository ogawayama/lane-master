import { useEffect, useState } from "react";
import { useLastRemoteEvent, type RemoteEvent } from "@/hooks/useRemoteControl";

/**
 * Helhetsprototyp — on-screen visualisering av fjärrtryck.
 *
 * Visas i hörnet på /duk (och valfritt /tablet) under prototyp-test
 * så testpersoner ser exakt vad keyboard-fjärren skickade. Per
 * helhetsprototyp/plan.md §4.
 *
 * Detta är NOLL produktivt UI — det är ett test-instrument. Tas bort
 * (eller hidden bakom `?debug=1`) inför riktig användarstudie där vi
 * inte vill att testpersonen ser sin egen knapp blinka.
 */

const LABEL: Record<RemoteEvent, string> = {
  left: "◀",
  right: "▶",
  up: "▲",
  down: "▼",
  ok: "OK",
  back: "BACK",
  holdOk: "HOLD OK",
};

const HIGHLIGHT_MS = 600;

export function RemoteOverlay({
  position = "bottom-right",
}: {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}) {
  const last = useLastRemoteEvent();
  const [flashing, setFlashing] = useState<RemoteEvent | null>(null);

  useEffect(() => {
    if (!last) return;
    setFlashing(last.event);
    const t = setTimeout(() => setFlashing(null), HIGHLIGHT_MS);
    return () => clearTimeout(t);
  }, [last]);

  const positionClass = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
  }[position];

  return (
    <div
      className={`fixed ${positionClass} z-50 pointer-events-none select-none`}
      aria-hidden
    >
      <div className="rounded-lg bg-black/60 backdrop-blur-sm p-3 text-white font-mono text-xs space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider text-white/50">
          Remote
        </div>
        <div className="grid grid-cols-3 gap-1 w-24">
          <div />
          <Key event="up" flashing={flashing} />
          <div />
          <Key event="left" flashing={flashing} />
          <Key event="ok" flashing={flashing} />
          <Key event="right" flashing={flashing} />
          <Key event="back" flashing={flashing} />
          <Key event="down" flashing={flashing} />
          <Key event="holdOk" flashing={flashing} />
        </div>
      </div>
    </div>
  );
}

function Key({
  event,
  flashing,
}: {
  event: RemoteEvent;
  flashing: RemoteEvent | null;
}) {
  const isFlash = flashing === event;
  const isSmall = event === "back" || event === "holdOk";
  return (
    <div
      className={`flex items-center justify-center rounded transition-colors duration-150 h-7 ${
        isFlash ? "bg-white text-black" : "bg-white/15 text-white/90"
      } ${isSmall ? "text-[9px]" : "text-xs"}`}
    >
      {LABEL[event]}
    </div>
  );
}
