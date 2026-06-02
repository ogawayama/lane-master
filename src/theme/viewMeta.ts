/**
 * Per-vy titel + favicon (introducerat 2026-06-02).
 *
 * Ger varje route en kort passande dokumenttitel och en egen SVG-webicon
 * (Saab-gul glyf på neutral mörk bricka). Drivs av en useEffect i App.tsx
 * som sätter document.title + <link rel="icon"> per pathname.
 *
 * SVG-favicons (inte binär .ico): skarpa i alla storlekar, en glyf per vy
 * utan att skeppa binärfiler. Saab-paletten: bg #1A1A1B, glyf #FAB900.
 */

const BG = "#1A1A1B";
const FG = "#FAB900";

/** Wrappa en glyf i den delade brickan (rundad fyrkant, Saab-mörk). */
const frame = (glyph: string): string =>
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>` +
  `<rect width='32' height='32' rx='7' fill='${BG}'/>${glyph}</svg>`;

// Glyfer (32×32-koordinatrum, ~8–24 säker zon).
const GLYPH: Record<string, string> = {
  // Brand — sköld (Gunnery & Skills)
  brand: `<path d='M16 4l9 3.2v6.3c0 5.6-3.8 9.9-9 11.9-5.2-2-9-6.3-9-11.9V7.2z' fill='${FG}'/>`,
  // Check-in — RFID-vågor + tagg
  checkin:
    `<circle cx='12' cy='16' r='3.2' fill='${FG}'/>` +
    `<path d='M17 11.5a6.5 6.5 0 010 9M20.5 8.5a11 11 0 010 15' fill='none' stroke='${FG}' stroke-width='2.2' stroke-linecap='round'/>`,
  // Banor — kolumner
  lanes:
    `<g fill='${FG}'><rect x='8' y='8' width='3.5' height='16' rx='1.2'/>` +
    `<rect x='14.25' y='8' width='3.5' height='16' rx='1.2'/>` +
    `<rect x='20.5' y='8' width='3.5' height='16' rx='1.2'/></g>`,
  // Admin — horisontella reglage
  admin:
    `<g stroke='${FG}' stroke-width='2.2' stroke-linecap='round'>` +
    `<line x1='8' y1='11' x2='24' y2='11'/><line x1='8' y1='16' x2='24' y2='16'/><line x1='8' y1='21' x2='24' y2='21'/></g>` +
    `<g fill='${BG}' stroke='${FG}' stroke-width='2'><circle cx='19' cy='11' r='2.4'/><circle cx='12' cy='16' r='2.4'/><circle cx='20' cy='21' r='2.4'/></g>`,
  // Duk — play (projektor)
  duk: `<path d='M13 9.5l10 6.5-10 6.5z' fill='${FG}'/>`,
  // Tablet — triage-prickar + rad
  tablet:
    `<g fill='${FG}'><circle cx='11' cy='12' r='2.6'/><circle cx='16' cy='12' r='2.6'/><circle cx='21' cy='12' r='2.6'/></g>` +
    `<rect x='8.5' y='18' width='15' height='3.2' rx='1.6' fill='${FG}'/>`,
  // Prepare — checklista
  prepare:
    `<g fill='none' stroke='${FG}' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'>` +
    `<path d='M8 11l2 2 3.5-3.5'/><path d='M8 19l2 2 3.5-3.5'/></g>` +
    `<g stroke='${FG}' stroke-width='2.2' stroke-linecap='round'><line x1='17' y1='11' x2='24' y2='11'/><line x1='17' y1='19' x2='24' y2='19'/></g>`,
  // Wizard — mixer-faders (vertikala)
  wizard:
    `<g stroke='${FG}' stroke-width='2.2' stroke-linecap='round'>` +
    `<line x1='11' y1='8' x2='11' y2='24'/><line x1='16' y1='8' x2='16' y2='24'/><line x1='21' y1='8' x2='21' y2='24'/></g>` +
    `<g fill='${BG}' stroke='${FG}' stroke-width='2'><circle cx='11' cy='13' r='2.4'/><circle cx='16' cy='19' r='2.4'/><circle cx='21' cy='12' r='2.4'/></g>`,
};

export interface ViewMeta {
  /** Kort dokumenttitel (utan brand-suffix; App.tsx lägger på " · G&S"). */
  title: string;
  /** Rå SVG-sträng för favicon (App.tsx bygger data-URI). */
  svg: string;
}

function sectionLabel(seg: string): string {
  switch (seg) {
    case "idt":
      return "IDT";
    case "odt":
      return "ODT";
    case "live-fire":
      return "Live Fire";
    case "qm360":
      return "QM 360";
    default:
      return seg.toUpperCase();
  }
}

const mk = (title: string, glyph: keyof typeof GLYPH): ViewMeta => ({
  title,
  svg: frame(GLYPH[glyph]),
});

/** Titel + favicon för en pathname. Mer specifik prefix först. */
export function viewMetaForPath(pathname: string): ViewMeta {
  const p = pathname;
  const seg = p.split("/")[1] ?? "";

  if (p.startsWith("/tablet/prepare")) return mk("Session Builder", "prepare");
  if (p.startsWith("/tablet")) return mk("Instructor Control", "tablet");
  if (p.startsWith("/duk")) return mk("Projector", "duk");
  if (p === "/wizard") return mk("Backstage", "wizard");
  if (p.endsWith("/admin")) return mk(`${sectionLabel(seg)} Admin`, "admin");
  if (p.endsWith("/lanes")) return mk(`${sectionLabel(seg)} Lanes`, "lanes");
  if (p === "/idt" || p === "/odt" || p === "/live-fire")
    return mk(`${sectionLabel(seg)} Check-in`, "checkin");
  if (p === "/qm360") return mk("QM 360 Pickup", "checkin");
  if (p === "/") return mk("Gunnery & Skills", "brand");
  return mk("Not Found", "brand");
}
