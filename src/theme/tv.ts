/**
 * 10-foot UI / Google TV-anpassning (introducerad 2026-05-28).
 *
 * Material Design 3 har TV-specifik guidance (developer.android.com/design/
 * ui/tv) som beskriver hur M3 anpassas för 10-fots-avstånd:
 *   • Større typografi-skala (1.5× M3-standard som tumregel)
 *   • Focus-driven nav (D-pad) istället för pointer + hover
 *   • Visuella focus-indikatorer som ALDRIG försvinner
 *   • Featured Carousel / Immersive List som hero-pattern
 *   • Safe insets i hörnen (TV overscan kan klippa kanter)
 *
 * Vi behåller useRemoteControl-hooken (vår fas-medvetna grammatik är
 * bättre än generic spatial nav) men adopterar M3-TV:s visuella språk:
 * DukTypography-tokens 1.5× större, focus-rings via outline-modellen
 * från Android TV Compose, hero-shape från M3 Expressive.
 */

import type { SxProps, Theme } from "@mui/material/styles";

/**
 * Type scale för 10-foot UI — anpassad från M3:s standard-skala med
 * ungefär 1.5× multiplier. Alla värden i px. Användning i komponenter:
 *   <Typography sx={{ ...dukTypography.displayLarge }}>
 */
// Alla skalsteg använder clamp(min, fluid-vw, max) så typografin är
// resolutions-oberoende: läsbar i en liten preview OCH skalar upp på en
// 1080p/4K-projektor utan de hopp/tak som fasta px + breakpoints gav.
export const dukTypography = {
  displayLarge: {
    fontSize: "clamp(52px, 6vw, 96px)",
    lineHeight: 1.05,
    letterSpacing: "-0.5px",
    fontWeight: 300,
  },
  displayMedium: {
    fontSize: "clamp(40px, 4.5vw, 72px)",
    lineHeight: 1.05,
    letterSpacing: "-0.5px",
    fontWeight: 300,
  },
  displaySmall: {
    fontSize: "clamp(34px, 3.6vw, 56px)",
    lineHeight: 1.1,
    fontWeight: 400,
  },
  headlineLarge: {
    fontSize: "clamp(30px, 3vw, 48px)",
    lineHeight: 1.15,
    fontWeight: 400,
  },
  headlineMedium: {
    fontSize: "clamp(26px, 2.6vw, 40px)",
    lineHeight: 1.15,
    fontWeight: 400,
  },
  headlineSmall: {
    fontSize: "clamp(22px, 2.1vw, 32px)",
    lineHeight: 1.2,
    fontWeight: 400,
  },
  titleLarge: {
    fontSize: "clamp(20px, 1.8vw, 28px)",
    lineHeight: 1.25,
    letterSpacing: "0px",
    fontWeight: 500,
  },
  titleMedium: {
    fontSize: "clamp(17px, 1.4vw, 24px)",
    lineHeight: 1.3,
    letterSpacing: "0.15px",
    fontWeight: 500,
  },
  bodyLarge: {
    fontSize: "clamp(16px, 1.3vw, 22px)",
    lineHeight: 1.4,
    letterSpacing: "0.15px",
    fontWeight: 400,
  },
  bodyMedium: {
    fontSize: "clamp(14px, 1.1vw, 19px)",
    lineHeight: 1.4,
    letterSpacing: "0.25px",
    fontWeight: 400,
  },
  labelLarge: {
    fontSize: "clamp(13px, 1.05vw, 18px)",
    lineHeight: 1.3,
    letterSpacing: "0.5px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
  },
  labelMedium: {
    fontSize: "clamp(12px, 0.95vw, 16px)",
    lineHeight: 1.3,
    letterSpacing: "1.5px",
    fontWeight: 500,
    textTransform: "uppercase" as const,
  },
  // Monospaced numerics (shot counts, lane-tallies) — läsbara på 10 fot.
  labelMono: {
    fontSize: "clamp(13px, 1.1vw, 20px)",
    lineHeight: 1.3,
    fontFamily: '"Roboto Mono", "Courier New", monospace',
    fontVariantNumeric: "tabular-nums" as const,
    fontWeight: 400,
  },
  // För nedräknings-timer på SimulationDuk — extra-stort, monospaced.
  // clamp() så den blir hero på projektor men inte spränger små vyer.
  timerHero: {
    fontSize: "clamp(72px, 11vw, 200px)",
    lineHeight: 1,
    fontFamily: '"Roboto Mono", "Courier New", monospace',
    fontWeight: 200,
    fontVariantNumeric: "tabular-nums" as const,
    letterSpacing: "-2px",
  },
};

/**
 * Focus-ring för TV — alltid synlig på fokuserade element. Använder
 * primary-färgen + offset så den syns mot vilken bakgrund som helst.
 *
 * Användning:
 *   <Box sx={{ ...focusRing(focused), ... }}>
 */
export function focusRing(active: boolean): SxProps<Theme> {
  return {
    outline: active ? "3px solid" : "none",
    outlineColor: "primary.main",
    outlineOffset: "4px",
    transition: "outline-color 150ms cubic-bezier(0.2, 0, 0, 1)",
  };
}

/**
 * TV-safe insets — ungefärlig overscan-margin för äldre TV (idag mest
 * irrelevant men billig försäkring). Drar in 5% från varje kant.
 */
export const tvSafeInset = {
  paddingTop: "2.5vh",
  paddingBottom: "2.5vh",
  paddingLeft: "2.5vw",
  paddingRight: "2.5vw",
};

/**
 * Hero-card-shape för TV (Featured Carousel / Immersive List per
 * Android TV Compose). M3:s standard 16px corner blir för dimm-igt
 * på stor yta; TV vill ha 24-28px.
 */
export const heroCardSx: SxProps<Theme> = {
  borderRadius: "28px",
  overflow: "hidden",
  position: "relative",
};

/**
 * Carousel-item-shape — något mindre än hero, fortfarande robust.
 */
export const carouselItemSx: SxProps<Theme> = {
  borderRadius: "20px",
  overflow: "hidden",
};

/**
 * Surface-elevation för duken. M3 har 5 levels men i mörker behöver vi
 * tonal-tint (vit över surface) snarare än drop-shadow.
 */
export function tonalSurface(level: 1 | 2 | 3 | 4 | 5): SxProps<Theme> {
  const tintAlpha = [0.05, 0.08, 0.11, 0.12, 0.14][level - 1];
  return {
    backgroundColor: "background.default",
    backgroundImage: `linear-gradient(rgba(255,255,255,${tintAlpha}), rgba(255,255,255,${tintAlpha}))`,
  };
}
