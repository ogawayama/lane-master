import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Helhetsprototyp — fjärrkontroll-grammatik (Pass 0, brygga 2026-06-11).
 *
 * Mappar keyboard-input till diskreta fjärr-events. Per
 * helhetsprototyp/plan.md §4 är den minimala grammatiken:
 *
 *   ◀ ▶            karusell-navigation (AAR mellan skyttar, browse)
 *   ▲ ▼            browse-listor (välj övning)
 *   OK / Select    bekräfta, "Start", "Next Exercise"
 *   Back           tillbaka ett steg
 *   Hold OK        switch trainee / avsluta runda
 *
 * Tangentbordsmappning:
 *   ArrowLeft/Right/Up/Down → motsvarande event
 *   Enter (kort tryck)       → OK
 *   Enter (håll > 600 ms)    → HoldOK
 *   Shift+Enter              → HoldOK (genväg)
 *   Backspace                → Back
 *
 * Auto-repeat (hållen tangent) ignoreras — en hållen Enter ska ge ETT
 * HoldOK, inte en kaskad av OK som rusar genom faserna.
 *
 * Events bryggas mellan ytor via en Supabase broadcast-kanal, så
 * /wizard-panelens knappar (annan flik/maskin) når duken. Lokalt
 * genererade events dispatchas direkt och broadcastas; mottagna events
 * dispatchas enbart lokalt (ingen re-broadcast → ingen loop).
 *
 * On-screen RemoteOverlay (separat komponent) lyssnar på samma events
 * så testpersoner ser vad som tryckts.
 */

export type RemoteEvent =
  | "left"
  | "right"
  | "up"
  | "down"
  | "ok"
  | "back"
  | "holdOk";

type Handler = (event: RemoteEvent) => void;

const HOLD_MS = 600;

const listeners = new Set<Handler>();
let lastEvent: { event: RemoteEvent; at: number } | null = null;
const lastEventListeners = new Set<(e: { event: RemoteEvent; at: number } | null) => void>();

/** Dispatch till lokala lyssnare — ingen broadcast. */
function dispatch(event: RemoteEvent) {
  const stamped = { event, at: Date.now() };
  lastEvent = stamped;
  listeners.forEach((h) => h(event));
  lastEventListeners.forEach((h) => h(stamped));
}

// — Supabase-brygga ————————————————————————————————————————————————
// En global kanal räcker för prototypen (ett test åt gången).
let bridge: ReturnType<typeof supabase.channel> | null = null;
function installBridge() {
  if (bridge) return;
  bridge = supabase.channel("remote-bridge", {
    config: { broadcast: { self: false } },
  });
  bridge.on("broadcast", { event: "remote" }, (msg) => {
    const ev = (msg.payload as { event?: RemoteEvent } | undefined)?.event;
    // Endast lokal dispatch — re-broadcast skulle ge en loop mellan fönster.
    if (ev) dispatch(ev);
  });
  bridge.subscribe();
}

/** Lokalt genererat event: dispatcha + broadcasta till övriga ytor. */
function emit(event: RemoteEvent) {
  dispatch(event);
  void bridge?.send({ type: "broadcast", event: "remote", payload: { event } });
}

// — Keyboard ————————————————————————————————————————————————————————
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!(
    el &&
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
  );
}

function keyToEvent(key: string): RemoteEvent | null {
  switch (key) {
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    case "Backspace":
      return "back";
    default:
      return null;
  }
}

let installed = false;
let holdTimer: number | null = null;

function installGlobalListener() {
  if (installed) return;
  installed = true;
  installBridge();

  window.addEventListener("keydown", (e) => {
    if (isTypingTarget(e.target)) return;

    if (e.key === "Enter") {
      e.preventDefault();
      if (e.repeat) return;
      if (e.shiftKey) {
        emit("holdOk");
        return;
      }
      // Kort tryck = OK (på keyup), hållen = HoldOK (vid tröskeln).
      holdTimer = window.setTimeout(() => {
        holdTimer = null;
        emit("holdOk");
      }, HOLD_MS);
      return;
    }

    if (e.repeat) return;
    const event = keyToEvent(e.key);
    if (event) {
      e.preventDefault();
      emit(event);
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key !== "Enter") return;
    if (holdTimer !== null) {
      window.clearTimeout(holdTimer);
      holdTimer = null;
      emit("ok");
    }
  });
}

/**
 * Subscribe to remote events. Returns latest event for convenience
 * (the actual reactive value lives in useLastRemoteEvent).
 *
 * Typical usage:
 *   useRemoteControl((event) => {
 *     if (event === "ok") startExercise();
 *   });
 */
export function useRemoteControl(handler?: Handler): void {
  useEffect(() => {
    installGlobalListener();
    if (!handler) return;
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, [handler]);
}

/**
 * For the on-screen RemoteOverlay: subscribes to the most recent event
 * so the overlay can flash a key.
 */
export function useLastRemoteEvent(): { event: RemoteEvent; at: number } | null {
  const [value, setValue] = useState(lastEvent);
  useEffect(() => {
    installGlobalListener();
    const handler = (e: { event: RemoteEvent; at: number } | null) => setValue(e);
    lastEventListeners.add(handler);
    return () => {
      lastEventListeners.delete(handler);
    };
  }, []);
  return value;
}

/**
 * Programmatic dispatch — for the WizardShell facilitator panel to
 * simulate remote presses without keyboard. Broadcastas till alla ytor
 * via Supabase-bryggan, så wizard-fliken kan driva duken.
 */
export function pressRemote(event: RemoteEvent): void {
  installBridge();
  emit(event);
}
