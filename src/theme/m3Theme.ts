import { createTheme } from "@mui/material/styles";
import { buildM3Scheme, type M3Scheme } from "./m3Palette";

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

const darkScheme = buildM3Scheme(undefined, "dark");
const lightScheme = buildM3Scheme(undefined, "light");

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
      contrastText: "#000000",
      light: s.statusWarningContainer,
      dark: s.statusWarning,
    },
    success: {
      main: s.statusSuccess,
      contrastText: "#000000",
      light: s.statusSuccessContainer,
      dark: s.statusSuccess,
    },
    info: {
      main: s.tertiary,
      contrastText: s.onTertiary,
      light: s.tertiaryContainer,
      dark: s.tertiary,
    },
    background: {
      default: s.background,
      paper: s.surface,
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

export const m3Theme = createTheme({
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
  // M3 corner radius scale (none, xs, sm, md, lg, xl, full)
  shape: {
    borderRadius: 12, // M3 default = sm/md i deras shape-skala
  },
  // M3 type scale — display/headline/title/body/label × large/medium/small.
  // Roboto Flex ideal men system-ui som fallback för att inte tvinga
  // font-load just nu. Vi kan importera Roboto Flex via @fontsource senare.
  typography: {
    fontFamily:
      '"Roboto Flex", "Roboto", "Helvetica Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    // Display
    h1: { fontSize: "57px", lineHeight: "64px", letterSpacing: "-0.25px", fontWeight: 400 },
    // Headline
    h2: { fontSize: "45px", lineHeight: "52px", fontWeight: 400 },
    h3: { fontSize: "36px", lineHeight: "44px", fontWeight: 400 },
    // Title
    h4: { fontSize: "32px", lineHeight: "40px", fontWeight: 400 },
    h5: { fontSize: "28px", lineHeight: "36px", fontWeight: 400 },
    h6: { fontSize: "24px", lineHeight: "32px", fontWeight: 500 },
    // Body
    body1: { fontSize: "16px", lineHeight: "24px", letterSpacing: "0.5px", fontWeight: 400 },
    body2: { fontSize: "14px", lineHeight: "20px", letterSpacing: "0.25px", fontWeight: 400 },
    // Label
    subtitle1: { fontSize: "14px", lineHeight: "20px", letterSpacing: "0.1px", fontWeight: 500 },
    subtitle2: { fontSize: "12px", lineHeight: "16px", letterSpacing: "0.5px", fontWeight: 500 },
    button: {
      fontSize: "14px",
      lineHeight: "20px",
      letterSpacing: "0.1px",
      fontWeight: 500,
      textTransform: "none", // M3 buttons är inte uppercase
    },
    caption: { fontSize: "12px", lineHeight: "16px", letterSpacing: "0.4px", fontWeight: 400 },
    overline: {
      fontSize: "11px",
      lineHeight: "16px",
      letterSpacing: "0.5px",
      fontWeight: 500,
      textTransform: "uppercase",
    },
  },
  components: {
    // M3 buttons är pill-formade (cap = 20px) med icon-spacing.
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 20,
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 10,
          paddingBottom: 10,
          minHeight: 40,
        },
      },
    },
    // M3 cards = surface-container, mjuka hörn, ingen ram by default
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: "none",
        },
      },
    },
    // M3 chips
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    // M3 dialogs
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 28 },
      },
    },
  },
});
