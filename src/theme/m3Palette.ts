import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
  TonalPalette,
  Hct,
  SchemeTonalSpot,
  MaterialDynamicColors,
  type DynamicColor,
  type DynamicScheme,
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
  /** Vilket varumärkes-lager schemat kommer från — låter komponenter
   *  branch:a på Saab vs M3 utan att gissa på hex-värden. */
  brand?: "m3" | "saab";
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
  /**
   * Triage-triad (eget tillägg utöver M3-spec). Balanserad röd/gul/grön
   * med samma chroma och tydlig hue-separation — `*On` är textfärgen som
   * uppfyller ≥4.5:1 mot respektive `main` (genererad, inte gissad).
   */
  statusAttention: string; // röd
  statusAttentionOn: string;
  statusAttentionContainer: string;
  statusWarning: string; // gul/amber
  statusWarningOn: string;
  statusWarningContainer: string;
  statusSuccess: string; // grön
  statusSuccessOn: string;
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
 * En semantisk roll (main + on-main + container + on-container) genererad
 * från en hue+chroma via en HCT-tonal-palett. Tonerna väljs mode-medvetet
 * så att on-main alltid har ≥4.5:1 mot main (tone-gap ≥ ~55):
 *   dark:  main 80 / on 20 · container 30 / on 90   (ljusa fyllningar)
 *   light: main 42 / on 100 · container 90 / on 10   (mörka fyllningar)
 * Detta är M3:s egen kontrast-matematik (tone-skillnad ⇒ kontrast), inte
 * gissade hexar.
 */
function roleFromHueChroma(hue: number, chroma: number, isDark: boolean) {
  const p = TonalPalette.fromHueAndChroma(hue, chroma);
  return {
    main: hexFromArgb(p.tone(isDark ? 80 : 42)),
    onMain: hexFromArgb(p.tone(isDark ? 20 : 100)),
    container: hexFromArgb(p.tone(isDark ? 30 : 90)),
    onContainer: hexFromArgb(p.tone(isDark ? 90 : 10)),
  };
}

/**
 * Triage-triad — balanserad röd/gul/grön. Tre tydligt separerade hues med
 * jämn chroma så att paret röd↔gul (det säkerhetskritiska) är *mest*
 * urskiljbart, inte minst. (Tidigare buggen: error #ffb4ab salmon vs
 * warning #ffb786 peach låg ~15° isär och båda ljusa → svåra att skilja.)
 *   röd   hue 25  · gul/amber hue 85 (klart guld, inte brun) · grön hue 145
 */
function buildTriad(isDark: boolean) {
  const red = roleFromHueChroma(25, 66, isDark);
  const amber = roleFromHueChroma(85, 80, isDark);
  const green = roleFromHueChroma(145, 52, isDark);
  return {
    statusAttention: red.main,
    statusAttentionOn: red.onMain,
    statusAttentionContainer: red.container,
    statusWarning: amber.main,
    statusWarningOn: amber.onMain,
    statusWarningContainer: amber.container,
    statusSuccess: green.main,
    statusSuccessOn: green.onMain,
    statusSuccessContainer: green.container,
  };
}

/**
 * Varm amber-accent som tertiary. TonalSpot ger teal-seeden en *blå*
 * tertiary (hue +60° → ~slate-blue #4b607c), inte den amber koden tidigare
 * påstod. Vi override:ar tertiary till en äkta varm amber (hue 50,
 * orange-guld) — DEKORATIV accent (hero-overline, highlights), medvetet
 * skild från triage-gulet (hue 85) i både hue och användning så de inte
 * förväxlas.
 */
function buildAmberTertiary(isDark: boolean) {
  // Hue 62 (amber-guld) — medvetet bortom triage-rödet (hue 25) så den
  // dekorativa accenten inte förväxlas med triage-rödets ljusa salmon-ton.
  // Hög chroma så den läser som mättad accent, inte pastell.
  const t = roleFromHueChroma(62, 80, isDark);
  return {
    tertiary: t.main,
    onTertiary: t.onMain,
    tertiaryContainer: t.container,
    onTertiaryContainer: t.onContainer,
  };
}

/**
 * Bygger M3:s alla bas-roller + surface-container-familjen via M3:s
 * DynamicScheme + MaterialDynamicColors — vilket stödjer `contrastLevel`
 * (0 = standard, 0.5 = medium, 1.0 = high, per M3:s static baseline-
 * kontrastvarianter). Används bara när contrastLevel ≠ 0; standardläget
 * behåller den befintliga themeFromSourceColor-vägen byte-identiskt.
 */
function buildDynamicBase(seedHex: string, isDark: boolean, contrastLevel: number) {
  const scheme: DynamicScheme = new SchemeTonalSpot(
    Hct.fromInt(argbFromHex(seedHex)),
    isDark,
    contrastLevel,
  );
  const mdc = new MaterialDynamicColors();
  const h = (dc: DynamicColor) => hexFromArgb(dc.getArgb(scheme));
  return {
    primary: h(mdc.primary()),
    onPrimary: h(mdc.onPrimary()),
    primaryContainer: h(mdc.primaryContainer()),
    onPrimaryContainer: h(mdc.onPrimaryContainer()),
    secondary: h(mdc.secondary()),
    onSecondary: h(mdc.onSecondary()),
    secondaryContainer: h(mdc.secondaryContainer()),
    onSecondaryContainer: h(mdc.onSecondaryContainer()),
    error: h(mdc.error()),
    onError: h(mdc.onError()),
    errorContainer: h(mdc.errorContainer()),
    onErrorContainer: h(mdc.onErrorContainer()),
    background: h(mdc.background()),
    onBackground: h(mdc.onBackground()),
    surface: h(mdc.surface()),
    onSurface: h(mdc.onSurface()),
    surfaceVariant: h(mdc.surfaceVariant()),
    onSurfaceVariant: h(mdc.onSurfaceVariant()),
    outline: h(mdc.outline()),
    outlineVariant: h(mdc.outlineVariant()),
    inverseSurface: h(mdc.inverseSurface()),
    inverseOnSurface: h(mdc.inverseOnSurface()),
    inversePrimary: h(mdc.inversePrimary()),
    shadow: h(mdc.shadow()),
    scrim: h(mdc.scrim()),
    surfaceTint: h(mdc.surfaceTint()),
    surfaceContainerLowest: h(mdc.surfaceContainerLowest()),
    surfaceContainerLow: h(mdc.surfaceContainerLow()),
    surfaceContainer: h(mdc.surfaceContainer()),
    surfaceContainerHigh: h(mdc.surfaceContainerHigh()),
    surfaceContainerHighest: h(mdc.surfaceContainerHighest()),
  };
}

export function buildM3Scheme(
  seedHex: string = DEFAULT_SEED,
  mode: "light" | "dark" = "dark",
  contrastLevel = 0,
): M3Scheme {
  const isDark = mode === "dark";
  const amberTertiary = buildAmberTertiary(isDark);
  const triad = buildTriad(isDark);

  // Hög/medel kontrast: använd DynamicScheme (stödjer contrastLevel) för
  // bas-roller + surface-containers. Triad + amber-tertiary läggs ovanpå.
  if (contrastLevel !== 0) {
    return { brand: "m3", ...buildDynamicBase(seedHex, isDark, contrastLevel), ...amberTertiary, ...triad };
  }

  // Standard (contrastLevel 0): oförändrad default-väg.
  const theme = themeFromSourceColor(argbFromHex(seedHex));
  const baseScheme = isDark ? theme.schemes.dark : theme.schemes.light;
  // toJSON ger argb-numbers per roll
  const baseMap = schemeToCssMap(baseScheme.toJSON() as unknown as Record<string, number>);
  const containers = buildSurfaceContainers(theme, isDark);

  return {
    brand: "m3",
    primary: baseMap.primary,
    onPrimary: baseMap.onPrimary,
    primaryContainer: baseMap.primaryContainer,
    onPrimaryContainer: baseMap.onPrimaryContainer,
    secondary: baseMap.secondary,
    onSecondary: baseMap.onSecondary,
    secondaryContainer: baseMap.secondaryContainer,
    onSecondaryContainer: baseMap.onSecondaryContainer,
    // tertiary override:ad till en äkta varm amber (se buildAmberTertiary).
    ...amberTertiary,
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
    // Triage-triad: balanserad röd/gul/grön (se buildTriad).
    ...triad,
  };
}

/**
 * Saab-branding-schema (introducerat 2026-06-02). Additivt alternativ till
 * den teal-seedade M3-paletten — väljs via `?brand=saab` i App.tsx; teal
 * är oförändrad default.
 *
 * Skiljer sig STRUKTURELLT från M3:s "en seed tonar allt": Saab vill ha
 * NEUTRALT grått (ingen kulörton i ytorna) + gult ENBART som CTA + blått
 * sekundärt. Därför *pinnas* roll-färgerna explicit till Saabs brand-hexar
 * i stället för att deriveras ur en seed, och neutralerna är äkta grå (inte
 * seed-tonade). En naiv `DEFAULT_SEED = #FAB900` hade tonat alla ytor gula
 * och gjort primary till förgrundsfärg — fel för Saab.
 *
 * Status-triaden återanvänds (buildTriad) — redan balanserad och kontrast-
 * säker. Se GS-POM/design/saab-branding.md + dess "Application notes".
 */
export function buildSaabScheme(mode: "light" | "dark" = "dark"): M3Scheme {
  const isDark = mode === "dark";
  const triad = buildTriad(isDark);

  const dark: Omit<M3Scheme, keyof ReturnType<typeof buildTriad> | "brand"> = {
    primary: "#FAB900", onPrimary: "#2A2620",
    primaryContainer: "#5A4A12", onPrimaryContainer: "#FFEBB3",
    secondary: "#9BC2EF", onSecondary: "#0A2A4E",
    secondaryContainer: "#1F3A5C", onSecondaryContainer: "#CCDDF3",
    tertiary: "#B4AA98", onTertiary: "#2A2620",
    tertiaryContainer: "#4A453E", onTertiaryContainer: "#E0DCD6",
    error: "#FFB4AB", onError: "#690005",
    errorContainer: "#93000A", onErrorContainer: "#FFDAD6",
    background: "#1A1A1B", onBackground: "#E9E9E8",
    surface: "#1A1A1B", onSurface: "#E9E9E8",
    surfaceVariant: "#2E2E2F", onSurfaceVariant: "#C7C4BF",
    outline: "#8C8881", outlineVariant: "#4A4A4C",
    inverseSurface: "#E9E9E8", inverseOnSurface: "#2A2620", inversePrimary: "#7A5900",
    shadow: "#000000", scrim: "#000000", surfaceTint: "#FAB900",
    // Neutralt grå djupskala (matchar de handtunade WoZ-värdena).
    surfaceContainerLowest: "#141414",
    surfaceContainerLow: "#232324",
    surfaceContainer: "#2B2B2C",
    surfaceContainerHigh: "#323234",
    surfaceContainerHighest: "#3A3A3C",
  };

  const light: typeof dark = {
    primary: "#FAB900", onPrimary: "#373532",
    primaryContainer: "#FFEBB3", onPrimaryContainer: "#2A2410",
    secondary: "#004C97", onSecondary: "#FFFFFF",
    secondaryContainer: "#CCDDF3", onSecondaryContainer: "#062A52",
    tertiary: "#756C62", onTertiary: "#FFFFFF",
    tertiaryContainer: "#E0DCD6", onTertiaryContainer: "#3A352F",
    error: "#DA291C", onError: "#FFFFFF",
    errorContainer: "#F9DEDC", onErrorContainer: "#410E0B",
    background: "#F3F3F2", onBackground: "#373532",
    surface: "#F3F3F2", onSurface: "#373532",
    surfaceVariant: "#E3E3E1", onSurfaceVariant: "#5A5752",
    outline: "#75726E", outlineVariant: "#C4C1BC",
    inverseSurface: "#373532", inverseOnSurface: "#F3F3F2", inversePrimary: "#FAB900",
    shadow: "#000000", scrim: "#000000", surfaceTint: "#FAB900",
    surfaceContainerLowest: "#FFFFFF",
    surfaceContainerLow: "#F6F6F5",
    surfaceContainer: "#ECECEA",
    surfaceContainerHigh: "#E6E6E4",
    surfaceContainerHighest: "#E0DCD6",
  };

  return { brand: "saab", ...(isDark ? dark : light), ...triad };
}
