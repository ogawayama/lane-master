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
export const dukTypography = {
  displayLarge: {
    fontSize: "84px",
    lineHeight: "92px",
    letterSpacing: "-0.5px",
    fontWeight: 300,
  },
  displayMedium: {
    fontSize: "64px",
    lineHeight: "72px",
    fontWeight: 300,
  },
  displaySmall: {
    fontSize: "52px",
    lineHeight: "60px",
    fontWeight: 400,
  },
  headlineLarge: {
    fontSize: "44px",
    lineHeight: "52px",
    fontWeight: 400,
  },
  headlineMedium: {
    fontSize: "36px",
    lineHeight: "44px",
    fontWeight: 400,
  },
  headlineSmall: {
    fontSize: "28px",
    lineHeight: "36px",
    fontWeight: 400,
  },
  titleLarge: {
    fontSize: "24px",
    lineHeight: "32px",
    letterSpacing: "0px",
    fontWeight: 500,
  },
  titleMedium: {
    fontSize: "20px",
    lineHeight: "28px",
    letterSpacing: "0.15px",
    fontWeight: 500,
  },
  bodyLarge: {
    fontSize: "20px",
    lineHeight: "28px",
    letterSpacing: "0.15px",
    fontWeight: 400,
  },
  bodyMedium: {
    fontSize: "18px",
    lineHeight: "24px",
    letterSpacing: "0.25px",
    fontWeight: 400,
  },
  labelLarge: {
    fontSize: "16px",
    lineHeight: "22px",
    letterSpacing: "0.5px",
    fontWeight: 500,
    textTransform: "uppercase" as const,
  },
  labelMedium: {
    fontSize: "14px",
    lineHeight: "20px",
    letterSpacing: "1.5px",
    fontWeight: 500,
    textTransform: "uppercase" as const,
  },
  // För nedräknings-timer på SimulationDuk — extra-stort, monospaced
  timerHero: {
    fontSize: "200px",
    lineHeight: "200px",
    fontFamily: '"Roboto Mono", "Courier New", monospace',
    fontWeight: 200,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-4px",
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
