/**
 * Material Design 3 — state-system + tonal elevation (introducerad 2026-05-28).
 *
 * M3 RIKTIG state-modell vs det vi gjorde innan:
 *  - default / focused / pressed / dragged / selected
 *  - rendrade som OPACITY-OVERLAYS på basfärgen
 *  - inte som separata utility-stilar
 *
 * M3 RIKTIG elevation vs det vi gjorde innan:
 *  - surface = base + primary-tint vid 5-14% opacity
 *  - NOT separate "surfaceContainer" / "surfaceContainerLow" hex-värden
 *  - elevation level höjer tint-procenten dynamiskt
 *
 * Per Material Design 3 + Android TV-spec.
 */

import type { SxProps, Theme } from "@mui/material/styles";

/* ──────────────────────────────────────────────────────────────────── */
/* Tonal elevation                                                       */
/* ──────────────────────────────────────────────────────────────────── */

/**
 * M3 elevation-level som primary-tint over base surface. För mörkt tema:
 * level 0 = bara base. level 5 = base + 14% primary-overlay.
 *
 * Per Android TV foundation: "While background color is static, surface
 * color can change. Surfaces at elevation levels +1 to +5 are tinted
 * via color overlays based on primary color."
 */
const TINT_BY_LEVEL = [0, 0.05, 0.08, 0.11, 0.12, 0.14] as const;

export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Tonal surface bakgrund. Använd istället för bgcolor: surfaceContainerLow
 * etc — denna ger en LIVE primary-tint som ändras med temat.
 *
 * Optional: tintColor för att overrida från primary till status-color
 * (för Immersive Lists där bakgrunden ska reflektera item-status).
 */
export function tonalSurface(level: ElevationLevel, tintColor = "primary"): SxProps<Theme> {
  if (level === 0) return { backgroundColor: "background.default" };
  const alpha = TINT_BY_LEVEL[level];
  return {
    backgroundColor: "background.default",
    backgroundImage: `linear-gradient(rgba(var(--mui-palette-${tintColor}-mainChannel) / ${alpha}), rgba(var(--mui-palette-${tintColor}-mainChannel) / ${alpha}))`,
  };
}

/* ──────────────────────────────────────────────────────────────────── */
/* State layers                                                          */
/* ──────────────────────────────────────────────────────────────────── */

export type InteractionState = "default" | "hovered" | "focused" | "pressed";

const STATE_OPACITY: Record<InteractionState, number> = {
  default: 0,
  hovered: 0.08,
  focused: 0.12,
  pressed: 0.16,
};

/**
 * State layer som M3 vill ha det: vit overlay (i mörkt tema) med
 * specifik opacity per state, OVANPÅ basfärgen.
 *
 * Använd som overlay på Card/Box med position relative — denna
 * komponent returnerar &::before-pseudo via sx.
 */
export function stateLayer(
  state: InteractionState,
  color = "rgba(255, 255, 255, 1)",
): SxProps<Theme> {
  const opacity = STATE_OPACITY[state];
  return {
    position: "relative",
    "&::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      backgroundColor: color,
      opacity,
      pointerEvents: "none",
      transition: "opacity 150ms cubic-bezier(0.2, 0, 0, 1)",
      borderRadius: "inherit",
    },
  };
}

/* ──────────────────────────────────────────────────────────────────── */
/* TV focus indicator (scale + glow + outline + color)                  */
/* ──────────────────────────────────────────────────────────────────── */

/**
 * Per Android TV focus-system: "Mix and match scale, border, glow, and
 * color properties for context-appropriate effects. Default scaling
 * values: 1.025x, 1.05x, and 1.1x"
 *
 * Default = small-element mix (1.025 scale, 8dp glow, no outline)
 * Medium  = medium-element mix (1.05 scale, 16dp glow, 2px outline)
 * Strong  = large-element mix (1.1 scale, 24dp glow, 3px outline)
 */
export type FocusEmphasis = "subtle" | "medium" | "strong";

const FOCUS_SPEC: Record<FocusEmphasis, { scale: number; glowDp: number; outlinePx: number }> = {
  subtle: { scale: 1.025, glowDp: 8, outlinePx: 0 },
  medium: { scale: 1.05, glowDp: 16, outlinePx: 2 },
  strong: { scale: 1.1, glowDp: 24, outlinePx: 3 },
};

/**
 * TV focus-indikator som M3 RIKTIGT vill ha det.
 * Mix av scale + glow + outline + color-change.
 *
 *   active=false → ingen styling, går smidigt tillbaka via transition
 *   active=true  → fullt focus med scale + glow + outline
 *
 * Använd med focusEmphasis="medium" för cards i hero-strippar,
 * "subtle" för small elements, "strong" för hero-element.
 */
export function tvFocus(active: boolean, emphasis: FocusEmphasis = "medium"): SxProps<Theme> {
  const spec = FOCUS_SPEC[emphasis];
  return {
    transition:
      "transform 200ms cubic-bezier(0.2, 0, 0, 1), box-shadow 200ms cubic-bezier(0.2, 0, 0, 1), outline-color 200ms",
    transform: active ? `scale(${spec.scale})` : "scale(1)",
    outline: spec.outlinePx > 0 ? `${spec.outlinePx}px solid` : "none",
    outlineColor: active ? "primary.main" : "transparent",
    outlineOffset: "4px",
    boxShadow: active
      ? `0 0 ${spec.glowDp}px rgba(var(--mui-palette-primary-mainChannel) / 0.5), 0 0 ${spec.glowDp * 2}px rgba(var(--mui-palette-primary-mainChannel) / 0.2)`
      : "none",
  };
}

/* ──────────────────────────────────────────────────────────────────── */
/* M3 motion tokens                                                      */
/* ──────────────────────────────────────────────────────────────────── */

/** M3 easing tokens — "emphasized" är default för normal interaktion. */
export const m3Easing = {
  emphasized: "cubic-bezier(0.2, 0, 0, 1)",
  emphasizedDecelerate: "cubic-bezier(0.05, 0.7, 0.1, 1)",
  emphasizedAccelerate: "cubic-bezier(0.3, 0, 0.8, 0.15)",
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  standardDecelerate: "cubic-bezier(0, 0, 0, 1)",
  standardAccelerate: "cubic-bezier(0.3, 0, 1, 1)",
} as const;

/** M3 duration tokens i ms. */
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
} as const;

/* ──────────────────────────────────────────────────────────────────── */
/* Status-tinted surface                                                 */
/* ──────────────────────────────────────────────────────────────────── */

/**
 * Surface med tonal-tint från status-färg. Används i Immersive List
 * där hero-bakgrunden ska reflektera den fokuserade itemens status.
 *
 * Detta är vår tolkning av M3:s "content-derived color" — istället för
 * att extrahera från en bild använder vi status-paletten.
 */
export function statusTintedSurface(
  status: "red" | "yellow" | "green",
  intensity: "subtle" | "ambient" | "saturated" = "ambient",
): SxProps<Theme> {
  const tintToken =
    status === "red"
      ? "var(--mui-palette-m3-statusAttention)"
      : status === "yellow"
        ? "var(--mui-palette-m3-statusWarning)"
        : "var(--mui-palette-m3-statusSuccess)";

  const alphaTop = intensity === "subtle" ? 0.04 : intensity === "ambient" ? 0.10 : 0.18;
  const alphaBot = intensity === "subtle" ? 0.01 : intensity === "ambient" ? 0.03 : 0.06;

  return {
    backgroundColor: "background.default",
    backgroundImage: `radial-gradient(ellipse at 30% 40%, color-mix(in srgb, ${tintToken} ${alphaTop * 100}%, transparent), transparent 70%), linear-gradient(to bottom, color-mix(in srgb, ${tintToken} ${alphaBot * 100}%, transparent), transparent)`,
  };
}
