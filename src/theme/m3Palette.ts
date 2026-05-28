import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
  type Theme,
} from "@material/material-color-utilities";

/**
 * Material Design 3 — palettgenerator (introducerad 2026-05-28).
 *
 * Tar en seed-färg och bygger M3:s hela tonala system via HCT (Hue,
 * Chroma, Tone) — samma algoritm som Google Material Theme Builder.
 * Returnerar både light- och dark-schema med alla M3 semantiska roller
 * (primary/secondary/tertiary/error + container/on-variants).
 *
 * Vald seed för helhetsprototypen: #006A6A (deep teal). Anledning:
 *   • Google använder denna i M3-demos → välbalanserad palett
 *   • Militär-adjacent ton, fungerar i biograf-mörker
 *   • Genererar amber-tertiary som bevarar vår nuvarande accent-känsla
 *   • Tydligt skild från purple/pink som känns out-of-domain
 *
 * För att byta seed: ändra DEFAULT_SEED. Theme regenereras automatiskt
 * vid nästa build. Theme Builder finns på material-foundation.github.io/
 * material-theme-builder för visuell preview innan byte.
 */

export const DEFAULT_SEED = "#006A6A";

export interface M3Scheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  shadow: string;
  scrim: string;
  surfaceTint: string;
  /** M3 expressive — surface elevation levels (M3 surface-container family). */
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  /** Status-extensioner (eget tillägg utöver M3-spec, för triage). */
  statusAttention: string;
  statusAttentionContainer: string;
  statusWarning: string;
  statusWarningContainer: string;
  statusSuccess: string;
  statusSuccessContainer: string;
}

function schemeToCssMap(scheme: Record<string, number>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, argb] of Object.entries(scheme)) {
    if (typeof argb === "number") out[key] = hexFromArgb(argb);
  }
  return out;
}

function buildSurfaceContainers(theme: Theme, isDark: boolean) {
  // M3 Expressive lägger till surface-container-familjen utöver vanliga
  // schemes.light/dark. Vi härleder dem från neutral-paletten via tones:
  //   light: 99 / 96 / 94 / 92 / 90
  //   dark:  4 / 10 / 12 / 17 / 22
  const tones = isDark ? [4, 10, 12, 17, 22] : [99, 96, 94, 92, 90];
  const [lowest, low, mid, high, highest] = tones.map((t) =>
    hexFromArgb(theme.palettes.neutral.tone(t)),
  );
  return {
    surfaceContainerLowest: lowest,
    surfaceContainerLow: low,
    surfaceContainer: mid,
    surfaceContainerHigh: high,
    surfaceContainerHighest: highest,
  };
}

/**
 * Status-färger för triage (red/yellow/green). M3 har bara en `error`-roll;
 * vi behöver tre nivåer för Hit/Time/Spread-triage. Behåller M3:s
 * error-rod som "attention", lägger till warning + success med matchande
 * tonal-paletter (orange + teal-green).
 */
function buildStatusColors(isDark: boolean) {
  // Seedar fasta sekundära paletter för warning + success — vi vill att de
  // håller sig oavsett primary-seed (red/yellow/green är universella).
  const warningTheme = themeFromSourceColor(argbFromHex("#B85C00"));
  const successTheme = themeFromSourceColor(argbFromHex("#2E7D32"));
  const errorScheme = isDark ? warningTheme.schemes.dark : warningTheme.schemes.light;
  const successScheme = isDark ? successTheme.schemes.dark : successTheme.schemes.light;
  return {
    statusWarning: hexFromArgb(errorScheme.primary),
    statusWarningContainer: hexFromArgb(errorScheme.primaryContainer),
    statusSuccess: hexFromArgb(successScheme.primary),
    statusSuccessContainer: hexFromArgb(successScheme.primaryContainer),
  };
}

export function buildM3Scheme(
  seedHex: string = DEFAULT_SEED,
  mode: "light" | "dark" = "dark",
): M3Scheme {
  const isDark = mode === "dark";
  const theme = themeFromSourceColor(argbFromHex(seedHex));
  const baseScheme = isDark ? theme.schemes.dark : theme.schemes.light;

  // toJSON ger argb-numbers per roll
  const baseMap = schemeToCssMap(baseScheme.toJSON() as unknown as Record<string, number>);
  const containers = buildSurfaceContainers(theme, isDark);
  const warningSuccess = buildStatusColors(isDark);

  return {
    primary: baseMap.primary,
    onPrimary: baseMap.onPrimary,
    primaryContainer: baseMap.primaryContainer,
    onPrimaryContainer: baseMap.onPrimaryContainer,
    secondary: baseMap.secondary,
    onSecondary: baseMap.onSecondary,
    secondaryContainer: baseMap.secondaryContainer,
    onSecondaryContainer: baseMap.onSecondaryContainer,
    tertiary: baseMap.tertiary,
    onTertiary: baseMap.onTertiary,
    tertiaryContainer: baseMap.tertiaryContainer,
    onTertiaryContainer: baseMap.onTertiaryContainer,
    error: baseMap.error,
    onError: baseMap.onError,
    errorContainer: baseMap.errorContainer,
    onErrorContainer: baseMap.onErrorContainer,
    background: baseMap.background,
    onBackground: baseMap.onBackground,
    surface: baseMap.surface,
    onSurface: baseMap.onSurface,
    surfaceVariant: baseMap.surfaceVariant,
    onSurfaceVariant: baseMap.onSurfaceVariant,
    outline: baseMap.outline,
    outlineVariant: baseMap.outlineVariant,
    inverseSurface: baseMap.inverseSurface,
    inverseOnSurface: baseMap.inverseOnSurface,
    inversePrimary: baseMap.inversePrimary,
    shadow: baseMap.shadow,
    scrim: baseMap.scrim,
    surfaceTint: baseMap.surfaceTint,
    ...containers,
    // Triage: attention = M3 error (deras default röda är välbalanserad)
    statusAttention: baseMap.error,
    statusAttentionContainer: baseMap.errorContainer,
    ...warningSuccess,
  };
}
