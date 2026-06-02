/**
 * Per-yta-teman (introducerade 2026-06-01).
 *
 * MUI:s tre-lagers-arkitektur (building-extensible-themes): ETT delat
 * token-lager (m3Theme — palette/typografi/shape från #006A6A-seeden)
 * och fyra tunna per-yta-teman som specialiserar *intent* — densitet,
 * motion, komponent-defaults och avsett mode — utan att duplicera tokens.
 *
 * Ytorna (se design/m3-designsystem.md i GS-POM):
 *   • dukTheme     — projektorduken, 10-fot, fjärr. Biograf: cinema-motion,
 *                    stora hero-shapes, mörkt. Fokus = scale (se tv.ts).
 *   • kioskTheme   — self-service check-in, pekskärm. Lugnt: enorma
 *                    touch-targets (≥64dp), ljust, en sak i taget.
 *   • prepTheme    — preparation, desktop-first. Control-room: tätt,
 *                    listor/tabeller, ljust, list-detail-layout.
 *   • tabletTheme  — during-action triage, instruktör. Control-room: tätt,
 *                    status-lett, mörkt (låg bländning i hallen).
 *
 * Adoption (icke-brytande — basappen kör vidare på m3Theme tills en vy
 * väljer att opta in): wrappa en yt-subtree i en egen ThemeProvider med
 * rätt mode, t.ex. i DukShell:
 *   <ThemeProvider theme={dukTheme} defaultMode="dark"> … </ThemeProvider>
 * `surfaceIntent[surface].mode` dokumenterar avsett default-mode per yta.
 */

import { createTheme, type Theme, type ThemeOptions } from "@mui/material/styles";
import { m3Theme, m3ThemeHighContrast, m3ThemeMediumContrast, saabTheme } from "./m3Theme";
import { cinemaTransitions, controlRoomTransitions } from "./motion";

/** Avsett default-mode + kort intent per yta (för ThemeProvider-wrappers). */
export const surfaceIntent = {
  duk: { mode: "dark", intent: "biograf — lugn, stor, scale-fokus" },
  kiosk: { mode: "light", intent: "calm — enorma touch-targets, en sak i taget" },
  prepare: { mode: "light", intent: "control-room — tätt, list-detail" },
  tablet: { mode: "dark", intent: "control-room — tätt, status-lett, låg bländning" },
} as const;

// Per-yta-overrides (motion/densitet/shape/komponenter) — kontrast-oberoende.
// Appliceras ovanpå ett bas-tema (standard eller hög/medel kontrast).

/** DUKEN — 10-fot, cinema-motion, stora hero-shapes. Mode: dark. */
const dukOverrides: ThemeOptions = {
  transitions: cinemaTransitions,
  shape: { borderRadius: 20 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 28,
          minHeight: 56,
          paddingLeft: 32,
          paddingRight: 32,
          fontSize: "clamp(15px, 1.2vw, 22px)",
        },
      },
    },
    MuiCard: { styleOverrides: { root: { borderRadius: 28 } } },
  },
};

/** KIOSK — pekskärm, ≥64dp touch-targets, control-room-motion. Mode: light. */
const kioskOverrides: ThemeOptions = {
  transitions: controlRoomTransitions,
  shape: { borderRadius: 16 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          minHeight: 64,
          paddingLeft: 32,
          paddingRight: 32,
          fontSize: 18,
        },
      },
    },
    MuiCard: { styleOverrides: { root: { borderRadius: 24 } } },
  },
};

/** PREPARATION — tät list-detail, control-room-motion. Mode: light. */
const prepOverrides: ThemeOptions = {
  transitions: controlRoomTransitions,
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { styleOverrides: { root: { minHeight: 40 } } },
    MuiListItemButton: {
      styleOverrides: { root: { borderRadius: 8, paddingTop: 6, paddingBottom: 6 } },
    },
    MuiCard: { styleOverrides: { root: { borderRadius: 12 } } },
  },
};

/** DURING-ACTION TABLET — tät, status-lett, control-room-motion. Mode: dark. */
const tabletOverrides: ThemeOptions = {
  transitions: controlRoomTransitions,
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { styleOverrides: { root: { minHeight: 44 } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 600 } } },
  },
};

/** Bygg de fyra yt-temana ovanpå ett givet bas-tema (kontrastnivå). */
function makeSurfaceThemes(base: Theme) {
  return {
    duk: createTheme(base, dukOverrides),
    kiosk: createTheme(base, kioskOverrides),
    prepare: createTheme(base, prepOverrides),
    tablet: createTheme(base, tabletOverrides),
  } as const;
}

/** Standard-kontrast yt-teman (default). */
export const surfaceThemes = makeSurfaceThemes(m3Theme);
/** Hög-kontrast yt-teman (M3 high contrast baseline). */
export const surfaceThemesHighContrast = makeSurfaceThemes(m3ThemeHighContrast);
/** Medel-kontrast yt-teman (M3 medium contrast baseline). */
export const surfaceThemesMediumContrast = makeSurfaceThemes(m3ThemeMediumContrast);
/** Saab-branding yt-teman (additivt, väljs via ?brand=saab). Samma per-yta-
 *  intent (motion/densitet/shape), Saab-paletten under. */
export const surfaceThemesSaab = makeSurfaceThemes(saabTheme);

export type SurfaceName = keyof typeof surfaceThemes;

/** Välj yt-tema-set för en kontrastnivå. */
export function surfaceThemesForContrast(
  contrast: "standard" | "medium" | "high",
): Record<SurfaceName, Theme> {
  if (contrast === "high") return surfaceThemesHighContrast;
  if (contrast === "medium") return surfaceThemesMediumContrast;
  return surfaceThemes;
}

/** Välj yt-tema-set för ett varumärke. Saab kör standard-kontrast; M3
 *  respekterar kontrast-parametern som tidigare. */
export function surfaceThemesForBrand(
  brand: "m3" | "saab",
  contrast: "standard" | "medium" | "high",
): Record<SurfaceName, Theme> {
  if (brand === "saab") return surfaceThemesSaab;
  return surfaceThemesForContrast(contrast);
}

/**
 * Mappa en route-pathname → yt-namn (eller null för bas-temat). Driver det
 * ENDA, route-styrda ThemeProvider:t i App.tsx. (Obs: mer specifik prefix
 * först — `/tablet/prepare` före `/tablet`.)
 */
export function surfaceForPath(pathname: string): SurfaceName | null {
  if (pathname.startsWith("/tablet/prepare")) return "prepare";
  if (pathname.startsWith("/tablet")) return "tablet";
  if (pathname.startsWith("/duk")) return "duk";
  if (pathname === "/idt" || pathname === "/odt" || pathname === "/live-fire") return "kiosk";
  return null;
}
