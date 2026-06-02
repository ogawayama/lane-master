import { createTheme } from "@mui/material/styles";
import { buildM3Scheme, buildSaabScheme, type M3Scheme } from "./m3Palette";
import { controlRoomTransitions } from "./motion";

/** Font-stackar per varumärke. Saab: Aktiv Grotesk, Arial som fallback
 *  (Saab brand-spec). Aktiv Grotesk är licensierad — Arial renderar tills
 *  fonten laddas in. */
const M3_FONT =
  '"Roboto Flex", "Roboto", "Helvetica Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const SAAB_FONT = '"Aktiv Grotesk", Arial, Helvetica, sans-serif';

/**
 * Material Design 3 — MUI v9 theme-konfiguration.
 *
 * Mappar M3-paletten (från m3Palette.ts) till MUI:s palette-strukturer.
 * extendTheme + CssVarsProvider exponerar varje token som --mui-palette-*
 * CSS-variabel, så Tailwind kan referera dem och MUI-komponenter
 * automatiskt får M3-färgerna.
 *
 * Type scale, shape, motion följer M3-spec. Density är något tätare
 * för tablet/wizard-vyer (3-foot), men 10-foot duk-vyer har en egen
 * dukTypography-skala i tv.ts som är 1.5x större.
 */

function paletteFromScheme(s: M3Scheme, mode: "light" | "dark") {
  return {
    // Mode MÅSTE deklareras explicit per scheme — annars vet inte MUI:s
    // CssVarsProvider hur den ska växla mellan light/dark via setMode().
    // (Tidigare antagande att "colorSchemes-nyckeln bestämmer mode" var
    // fel — orsakade att toggle bara ändrade html.light-klassen men
    // inte MUI:s --mui-palette-* CSS-variabler.)
    mode,
    primary: {
      main: s.primary,
      contrastText: s.onPrimary,
      light: s.primaryContainer,
      dark: s.primary,
    },
    secondary: {
      main: s.secondary,
      contrastText: s.onSecondary,
      light: s.secondaryContainer,
      dark: s.secondary,
    },
    // tertiary är M3-specifikt — exponeras via custom palette-key
    error: {
      main: s.error,
      contrastText: s.onError,
      light: s.errorContainer,
      dark: s.error,
    },
    warning: {
      main: s.statusWarning,
      // Mode-medveten kontrasttext (genererad on-color) — vit i ljust läge,
      // mörk i mörkt. Tidigare hårdkodat #000 föll AA i ljust läge.
      contrastText: s.statusWarningOn,
      light: s.statusWarningContainer,
      dark: s.statusWarning,
    },
    success: {
      main: s.statusSuccess,
      contrastText: s.statusSuccessOn,
      light: s.statusSuccessContainer,
      dark: s.statusSuccess,
    },
    // info pekar på secondary (neutral teal) — amber bor numera i tertiary
    // som dekorativ accent (theme.vars.palette.m3.tertiary), inte som "info".
    info: {
      main: s.secondary,
      contrastText: s.onSecondary,
      light: s.secondaryContainer,
      dark: s.secondary,
    },
    background: {
      // M3 tonal elevation: paper = surfaceContainer så kort/sheets får
      // tydlig tonal separation mot background.default. (surfaceContainerLow
      // räckte inte i mörkt läge — denna schemes background ligger på samma
      // ton som low; surfaceContainer är första garanterat skilda steget.)
      default: s.background,
      paper: s.surfaceContainer,
    },
    text: {
      primary: s.onSurface,
      secondary: s.onSurfaceVariant,
      disabled: `${s.onSurface}80`, // 50% opacity
    },
    divider: s.outlineVariant,
    // M3-extensions exponerade som custom keys — komponenter kan läsa via
    // theme.vars.palette.m3.X eller direkt CSS-vars var(--mui-palette-m3-X).
    m3: { ...s },
  } as const;
}

/** M3 type scale — delas av alla varumärken; bara fontFamily byts. */
function makeTypography(fontFamily: string) {
  return {
    fontFamily,
    h1: { fontSize: "57px", lineHeight: "64px", letterSpacing: "-0.25px", fontWeight: 400 },
    h2: { fontSize: "45px", lineHeight: "52px", fontWeight: 400 },
    h3: { fontSize: "36px", lineHeight: "44px", fontWeight: 400 },
    h4: { fontSize: "32px", lineHeight: "40px", fontWeight: 400 },
    h5: { fontSize: "28px", lineHeight: "36px", fontWeight: 400 },
    h6: { fontSize: "24px", lineHeight: "32px", fontWeight: 500 },
    body1: { fontSize: "16px", lineHeight: "24px", letterSpacing: "0.5px", fontWeight: 400 },
    body2: { fontSize: "14px", lineHeight: "20px", letterSpacing: "0.25px", fontWeight: 400 },
    subtitle1: { fontSize: "14px", lineHeight: "20px", letterSpacing: "0.1px", fontWeight: 500 },
    subtitle2: { fontSize: "12px", lineHeight: "16px", letterSpacing: "0.5px", fontWeight: 500 },
    button: {
      fontSize: "14px",
      lineHeight: "20px",
      letterSpacing: "0.1px",
      fontWeight: 500,
      textTransform: "none" as const,
    },
    caption: { fontSize: "12px", lineHeight: "16px", letterSpacing: "0.4px", fontWeight: 400 },
    overline: {
      fontSize: "11px",
      lineHeight: "16px",
      letterSpacing: "0.5px",
      fontWeight: 500,
      textTransform: "uppercase" as const,
    },
  };
}

const buttonRoot = {
  borderRadius: 20,
  paddingLeft: 24,
  paddingRight: 24,
  paddingTop: 10,
  paddingBottom: 10,
  minHeight: 40,
};

/** Delade M3-komponent-defaults (pill-knappar, mjuka kort/dialoger). */
const m3Components = {
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: { root: buttonRoot },
  },
  MuiCard: {
    defaultProps: { elevation: 0 },
    styleOverrides: { root: { borderRadius: 16, backgroundImage: "none" } },
  },
  MuiChip: { styleOverrides: { root: { borderRadius: 8 } } },
  MuiDialog: { styleOverrides: { paper: { borderRadius: 28 } } },
};

/**
 * Saab-komponent-defaults — kodar in "Application notes" från
 * GS-POM/design/saab-branding.md: gult är fill-only, så outlined/text-knappar
 * blir TYSTA (neutral etikett + grå outline), inte gula. Blått sparas till
 * äkta sekundära CTA:er/länkar (sätts per komponent via color="secondary").
 */
const saabComponents = {
  ...m3Components,
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: buttonRoot,
      // Neutral utility-knapp: on-surface-etikett, grå kant (oavsett color-prop).
      outlined: {
        color: "var(--mui-palette-text-primary)",
        borderColor: "var(--mui-palette-divider)",
      },
    },
  },
};

/**
 * Factory: bygg M3-temat på en given kontrastnivå (0 standard · 0.5 medium
 * · 1.0 high — M3:s static baseline-kontrastvarianter, m3.material.io/styles/
 * color/static/baseline). Endast paletten ändras med kontrast; typografi,
 * shape, motion och komponenter är gemensamma.
 */
export function createM3Theme(contrastLevel = 0) {
  const darkScheme = buildM3Scheme(undefined, "dark", contrastLevel);
  const lightScheme = buildM3Scheme(undefined, "light", contrastLevel);
  return createTheme({
  // cssVariables med colorSchemeSelector='data-mui-color-scheme' säger
  // åt MUI att generera CSS med attribut-selektorn istället för media-
  // query. Utan detta wrappar MUI dark scheme i @media (prefers-color-
  // scheme: dark) — vilket gör att setMode/setAttribute inte fungerar
  // (det aktiveras bara av browser settings).
  cssVariables: {
    colorSchemeSelector: "data-mui-color-scheme",
  },
  colorSchemes: {
    dark: { palette: paletteFromScheme(darkScheme, "dark") as never },
    light: { palette: paletteFromScheme(lightScheme, "light") as never },
  },
  // M3 motion — basen använder control-room-presetet (standard easing +
  // Short durations) som default. Duken override:ar med cinemaTransitions
  // via dukTheme (se surfaces.ts). Detta ger alla MUI-komponenter
  // (Dialog/Drawer/Fade/Collapse) M3-rätt timing utan per-komponent-arbete.
  transitions: controlRoomTransitions,
  // M3 corner radius scale (none, xs, sm, md, lg, xl, full)
  shape: {
    borderRadius: 12, // M3 default = sm/md i deras shape-skala
  },
  // M3 type scale — display/headline/title/body/label × large/medium/small.
  typography: makeTypography(M3_FONT),
  components: m3Components,
  });
}

/**
 * Saab-branding-tema (additivt, 2026-06-02) — väljs via `?brand=saab`.
 * Samma M3-struktur (type scale, shape, motion) men Saab-paletten
 * (buildSaabScheme), Aktiv Grotesk-typsnittet och Saab-komponent-defaults
 * (tysta outlined-knappar). Standard-kontrast; teal-M3 är oförändrad default.
 */
export function createSaabTheme() {
  const darkScheme = buildSaabScheme("dark");
  const lightScheme = buildSaabScheme("light");
  return createTheme({
    cssVariables: { colorSchemeSelector: "data-mui-color-scheme" },
    colorSchemes: {
      dark: { palette: paletteFromScheme(darkScheme, "dark") as never },
      light: { palette: paletteFromScheme(lightScheme, "light") as never },
    },
    transitions: controlRoomTransitions,
    shape: { borderRadius: 12 },
    typography: makeTypography(SAAB_FONT),
    components: saabComponents,
  });
}

/** Standard-kontrast (default). */
export const m3Theme = createM3Theme(0);
/** Medium-kontrast (M3 medium contrast baseline). */
export const m3ThemeMediumContrast = createM3Theme(0.5);
/** Hög kontrast (M3 high contrast baseline) — bra för 10-fots-duken. */
export const m3ThemeHighContrast = createM3Theme(1);

/** Saab-branding-tema (additivt, väljs via ?brand=saab). */
export const saabTheme = createSaabTheme();
