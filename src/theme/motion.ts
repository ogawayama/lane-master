/**
 * Material Design 3 — motion-system (introducerad 2026-06-01).
 *
 * M3 definierar två easing-familjer (standard + emphasized) och 16
 * duration-tokens. Vi exponerar dem som råa tokens + två yt-presets:
 *
 *   • cinema (duken)       — emphasized easing + Long/ExtraLong (450–1000 ms).
 *                            Lugna, filmiska lägesbyten på 10-fots-projektorn.
 *   • controlRoom (tablet, — standard easing + Short (50–200 ms).
 *     kiosk, prepare)        Snärtiga, responsiva state-byten i handen.
 *
 * Källor (deep-research 2026-06-01, förstapartsverifierat):
 *   developer.android.com .../theming/Motion.md · m3.material.io/styles/motion
 *
 * OBS: M3:s "emphasized" (symmetrisk) är en *path-baserad* kurva som CSS
 * inte kan uttrycka exakt — vi använder en vedertagen single-bezier-
 * approximation. Emphasized-accelerate/decelerate är däremot exakta.
 */

import type { ThemeOptions } from "@mui/material/styles";

/** M3 easing-set — exakta cubic-beziers (utom symmetrisk emphasized, se ovan). */
export const m3Easing = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  standardDecelerate: "cubic-bezier(0, 0, 0, 1)",
  standardAccelerate: "cubic-bezier(0.3, 0, 1, 1)",
  // Approximation av M3:s path-baserade emphasized (CSS saknar path-easing).
  emphasized: "cubic-bezier(0.2, 0, 0, 1)",
  emphasizedDecelerate: "cubic-bezier(0.05, 0.7, 0.1, 1)",
  emphasizedAccelerate: "cubic-bezier(0.3, 0, 0.8, 0.15)",
  // Linjär — för kontinuerliga lopp (timer, progress) där acceleration stör.
  linear: "linear",
} as const;

/** M3 duration-tokens i ms. Short → snärtigt, ExtraLong → filmiskt. */
export const m3Duration = {
  short1: 50,
  short2: 100,
  short3: 150,
  short4: 200,
  medium1: 250,
  medium2: 300,
  medium3: 350,
  medium4: 400,
  long1: 450,
  long2: 500,
  long3: 550,
  long4: 600,
  extraLong1: 700,
  extraLong2: 800,
  extraLong3: 900,
  extraLong4: 1000,
} as const;

/**
 * MUI transitions-block per yt-intent. MUI:s transition-nycklar
 * (shortest…enteringScreen) mappas mot M3-tokens så att *alla* MUI-
 * komponenter (Dialog, Drawer, Fade, Collapse …) ärver rätt känsla bara
 * genom att byta tema.
 */
export const controlRoomTransitions: ThemeOptions["transitions"] = {
  easing: {
    easeInOut: m3Easing.standard,
    easeOut: m3Easing.standardDecelerate,
    easeIn: m3Easing.standardAccelerate,
    sharp: m3Easing.standardAccelerate,
  },
  duration: {
    shortest: m3Duration.short1, // 50
    shorter: m3Duration.short2, // 100
    short: m3Duration.short3, // 150
    standard: m3Duration.short4, // 200
    complex: m3Duration.medium2, // 300
    enteringScreen: m3Duration.medium1, // 250
    leavingScreen: m3Duration.short4, // 200
  },
};

export const cinemaTransitions: ThemeOptions["transitions"] = {
  easing: {
    easeInOut: m3Easing.emphasized,
    easeOut: m3Easing.emphasizedDecelerate,
    easeIn: m3Easing.emphasizedAccelerate,
    sharp: m3Easing.emphasizedAccelerate,
  },
  duration: {
    shortest: m3Duration.medium2, // 300
    shorter: m3Duration.long1, // 450
    short: m3Duration.long2, // 500
    standard: m3Duration.long4, // 600
    complex: m3Duration.extraLong2, // 800
    enteringScreen: m3Duration.extraLong1, // 700
    leavingScreen: m3Duration.long3, // 550
  },
};

/** Bekväm sträng för sx/CSS: `transition: m3Transition('transform', 'long2')`. */
export function m3Transition(
  property: string,
  duration: keyof typeof m3Duration = "medium2",
  easing: keyof typeof m3Easing = "emphasized",
): string {
  return `${property} ${m3Duration[duration]}ms ${m3Easing[easing]}`;
}
