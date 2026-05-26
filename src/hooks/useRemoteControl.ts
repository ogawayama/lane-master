import { useEffect, useState } from "react";

/**
 * Helhetsprototyp — fjärrkontroll-grammatik (Pass 0).
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
 *   Enter                   → OK
 *   Backspace               → Back
 *   Shift+Enter             → HoldOK
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

const listeners = new Set<Handler>();
let lastEvent: { event: RemoteEvent; at: number } | null = null;
const lastEventListeners = new Set<(e: { event: RemoteEvent; at: number } | null) => void>();

function dispatch(event: RemoteEvent) {
  const stamped = { event, at: Date.now() };
  lastEvent = stamped;
  listeners.forEach((h) => h(event));
  lastEventListeners.forEach((h) => h(stamped));
}

function keyToEvent(e: KeyboardEvent): RemoteEvent | null {
  // Ignore input fields — facilitator may type elsewhere.
  const target = e.target as HTMLElement | null;
  if (
    target &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
  ) {
    return null;
  }
  switch (e.key) {
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    case "Enter":
      return e.shiftKey ? "holdOk" : "ok";
    case "Backspace":
      return "back";
    default:
      return null;
  }
}

let installed = false;
function installGlobalListener() {
  if (installed) return;
  installed = true;
  window.addEventListener("keydown", (e) => {
    const event = keyToEvent(e);
    if (event) {
      e.preventDefault();
      dispatch(event);
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
 * simulate remote presses without keyboard.
 */
export function pressRemote(event: RemoteEvent): void {
  dispatch(event);
}
