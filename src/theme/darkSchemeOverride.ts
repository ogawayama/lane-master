/**
 * Duk-specifik dark-scheme override (introducerad 2026-05-28).
 *
 * MUI v9:s CssVarsProvider genererar CSS-variabler under selektorn
 * `:root[data-mui-color-scheme='dark']` — vilket bara matchar
 * <html>-elementet. Att sätta data-mui-color-scheme på en nested div
 * fungerar INTE.
 *
 * För att alltid hålla duken i dark mode (det är en projektor) bygger
 * vi explicit dark M3-paletten en gång och exponerar den som ett
 * inline-style-objekt med override:ade CSS-variabler. Stoppas på
 * DukShell:s root-div så alla descendents (inklusive nested MUI-
 * komponenter som läser var(--mui-palette-*)) får dark-värdena.
 *
 * Stöder både --mui-palette-X-main (hex) och --mui-palette-X-mainChannel
 * (space-separated RGB för alpha-användning som t.ex. focus-glow).
 */

import type { CSSProperties } from "react";
import { argbFromHex, hexFromArgb } from "@material/material-color-utilities";
import { buildM3Scheme } from "./m3Palette";

const dark = buildM3Scheme(undefined, "dark");

/** Hex till "R G B" (space-separated) för MUI:s channel-format. */
function hexToChannel(hex: string): string {
  const argb = argbFromHex(hex);
  // Material-color-utilities packar som AARRGGBB int
  const r = (argb >> 16) & 0xff;
  const g = (argb >> 8) & 0xff;
  const b = argb & 0xff;
  return `${r} ${g} ${b}`;
}

const ch = (hex: string) => hexToChannel(hex);

// Pre-compute alla CSS-variabler vi använder. Mappar både MUI:s
// standard-palette-roller och våra M3-extension-tokens.
export const DARK_SCHEME_STYLE: CSSProperties & Record<string, string> = {
  // Background + text
  "--mui-palette-background-default": dark.background,
  "--mui-palette-background-defaultChannel": ch(dark.background),
  "--mui-palette-background-paper": dark.surface,
  "--mui-palette-background-paperChannel": ch(dark.surface),
  "--mui-palette-text-primary": dark.onBackground,
  "--mui-palette-text-primaryChannel": ch(dark.onBackground),
  "--mui-palette-text-secondary": dark.onSurfaceVariant,
  "--mui-palette-text-secondaryChannel": ch(dark.onSurfaceVariant),
  "--mui-palette-text-disabled": `${dark.onSurface}80`,
  "--mui-palette-divider": dark.outlineVariant,
  "--mui-palette-dividerChannel": ch(dark.outlineVariant),

  // Primary
  "--mui-palette-primary-main": dark.primary,
  "--mui-palette-primary-mainChannel": ch(dark.primary),
  "--mui-palette-primary-light": dark.primaryContainer,
  "--mui-palette-primary-lightChannel": ch(dark.primaryContainer),
  "--mui-palette-primary-dark": dark.primary,
  "--mui-palette-primary-contrastText": dark.onPrimary,

  // Secondary
  "--mui-palette-secondary-main": dark.secondary,
  "--mui-palette-secondary-mainChannel": ch(dark.secondary),
  "--mui-palette-secondary-light": dark.secondaryContainer,
  "--mui-palette-secondary-contrastText": dark.onSecondary,

  // Error
  "--mui-palette-error-main": dark.error,
  "--mui-palette-error-mainChannel": ch(dark.error),
  "--mui-palette-error-light": dark.errorContainer,
  "--mui-palette-error-contrastText": dark.onError,

  // Warning
  "--mui-palette-warning-main": dark.statusWarning,
  "--mui-palette-warning-mainChannel": ch(dark.statusWarning),
  "--mui-palette-warning-light": dark.statusWarningContainer,
  "--mui-palette-warning-contrastText": "#000000",

  // Success
  "--mui-palette-success-main": dark.statusSuccess,
  "--mui-palette-success-mainChannel": ch(dark.statusSuccess),
  "--mui-palette-success-light": dark.statusSuccessContainer,
  "--mui-palette-success-contrastText": "#000000",

  // Info → tertiary
  "--mui-palette-info-main": dark.tertiary,
  "--mui-palette-info-mainChannel": ch(dark.tertiary),
  "--mui-palette-info-light": dark.tertiaryContainer,
  "--mui-palette-info-contrastText": dark.onTertiary,

  // M3 extension tokens — surface-container-familjen
  "--mui-palette-m3-primary": dark.primary,
  "--mui-palette-m3-onPrimary": dark.onPrimary,
  "--mui-palette-m3-primaryContainer": dark.primaryContainer,
  "--mui-palette-m3-onPrimaryContainer": dark.onPrimaryContainer,
  "--mui-palette-m3-secondary": dark.secondary,
  "--mui-palette-m3-secondaryContainer": dark.secondaryContainer,
  "--mui-palette-m3-tertiary": dark.tertiary,
  "--mui-palette-m3-tertiaryContainer": dark.tertiaryContainer,
  "--mui-palette-m3-error": dark.error,
  "--mui-palette-m3-errorContainer": dark.errorContainer,
  "--mui-palette-m3-onErrorContainer": dark.onErrorContainer,
  "--mui-palette-m3-surface": dark.surface,
  "--mui-palette-m3-surfaceVariant": dark.surfaceVariant,
  "--mui-palette-m3-onSurfaceVariant": dark.onSurfaceVariant,
  "--mui-palette-m3-surfaceContainerLowest": dark.surfaceContainerLowest,
  "--mui-palette-m3-surfaceContainerLow": dark.surfaceContainerLow,
  "--mui-palette-m3-surfaceContainer": dark.surfaceContainer,
  "--mui-palette-m3-surfaceContainerHigh": dark.surfaceContainerHigh,
  "--mui-palette-m3-surfaceContainerHighest": dark.surfaceContainerHighest,
  "--mui-palette-m3-outline": dark.outline,
  "--mui-palette-m3-outlineVariant": dark.outlineVariant,
  "--mui-palette-m3-statusAttention": dark.statusAttention,
  "--mui-palette-m3-statusAttentionContainer": dark.statusAttentionContainer,
  "--mui-palette-m3-statusWarning": dark.statusWarning,
  "--mui-palette-m3-statusWarningContainer": dark.statusWarningContainer,
  "--mui-palette-m3-statusSuccess": dark.statusSuccess,
  "--mui-palette-m3-statusSuccessContainer": dark.statusSuccessContainer,

  // Och själva surface på root-elementet — så bakgrunden blir mörk direkt
  background: dark.background,
  color: dark.onBackground,
  colorScheme: "dark",
};

// Re-export för debug/inspection
export const DARK_SCHEME = dark;

// Tyst hexFromArgb-användning så TypeScript inte tar bort import
void hexFromArgb;
