import type { ExerciseListItem } from "@/services/sessionService";
import type { Criterion, Severity } from "@/data/cueLibrary";
import { buildShotSequence, type ShotSequence } from "@/services/shotSimulation";

/**
 * Helhetsprototyp — AAR-resultat (Pass 6, omdesignad 2026-05-28).
 *
 * Per [beslut 2026-05-28]: hits + spread härleds från samma skott-
 * sekvens som SimulationDuk visade live på papptavlorna. Det innebär
 * att AAR-siffrorna stämmer med bilden — instruktören kan peka på en
 * miss på tavlan och se den i HIT-räknaren.
 *
 * Time genereras separat (deterministiskt) eftersom skott-sekvensens
 * sista tidsstämpel är en överenskommen approximation, inte själva
 * "övningstiden".
 *
 * Triage-scoring per [spår 04 § Hypotes]:
 *   green   = i förhållande till tröskeln (passes the threshold)
 *   yellow  = strax under/över (borderline)
 *   red     = klart under/över (fail)
 */

export type Status = "green" | "yellow" | "red";

export interface AARResult {
  lane: number;
  trainee: string | null;
  weapon: string | null;
  hits: number;
  time_seconds: number;
  spread_cm: number;
  hit_status: Status;
  time_status: Status;
  spread_status: Status;
  reds: Criterion[];
  yellows: Criterion[];
  /** Skott-sekvensen som drev metrics — används för target-rendering. */
  sequence: ShotSequence;
}

/** Deterministisk LCG seedad på (lane, exercise.id). */
function seedFor(lane: number, exerciseId: string): number {
  let s = lane * 9301 + 49297;
  for (const ch of exerciseId) s = (s * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(s);
}

function lcg(initialSeed: number): () => number {
  let state = initialSeed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/**
 * Score one criterion. Returns severity given actual value vs threshold.
 * direction='le' means "lower is better" (time, spread); 'ge' means
 * "higher is better" (hits).
 */
function score(
  value: number,
  threshold: number,
  direction: "le" | "ge",
): Status {
  if (direction === "ge") {
    if (value >= threshold) return "green";
    if (value >= threshold * 0.7) return "yellow";
    return "red";
  }
  // direction === "le"
  if (value <= threshold) return "green";
  if (value <= threshold * 1.2) return "yellow";
  return "red";
}

export function computeResult(
  lane: number,
  trainee: string | null,
  weapon: string | null,
  exercise: ExerciseListItem,
): AARResult {
  const sequence = buildShotSequence(lane, exercise);

  // Hits = faktiskt antal träffar i sekvensen.
  const hits = sequence.shots.filter((s) => s.hit).length;

  // Spread i cm: spread_pct (0..40) skalas mot exercise.spread_threshold
  // så vi får realistisk mix grön/gul/röd. Faktor 1.6 ger lite glidning
  // över tröskeln för borderline-fallen.
  const spread_th = exercise.spread_threshold ?? 20;
  const spread = Math.max(
    1,
    Math.round((sequence.spread_pct / 40) * spread_th * 1.6),
  );

  // Time genereras separat — sekvensens tidstämplar är en approximation
  // av "när skotten föll", inte total övningstid. En extra LCG-rotering
  // ger spridning kring threshold.
  const rand = lcg(seedFor(lane, exercise.id) ^ 0x5a5a5a);
  const time_th = exercise.time_seconds ?? 60;
  const time = Math.round(time_th * (0.7 + rand() * 0.7));

  const hits_th = exercise.hits_threshold ?? 5;
  const hit_status = score(hits, hits_th, "ge");
  const time_status = score(time, time_th, "le");
  const spread_status = score(spread, spread_th, "le");

  const reds: Criterion[] = [];
  const yellows: Criterion[] = [];
  if (hit_status === "red") reds.push("hit");
  else if (hit_status === "yellow") yellows.push("hit");
  if (time_status === "red") reds.push("time");
  else if (time_status === "yellow") yellows.push("time");
  if (spread_status === "red") reds.push("spread");
  else if (spread_status === "yellow") yellows.push("spread");

  return {
    lane,
    trainee,
    weapon,
    hits,
    time_seconds: time,
    spread_cm: spread,
    hit_status,
    time_status,
    spread_status,
    reds,
    yellows,
    sequence,
  };
}

/**
 * Sort trainees so the most-red comes first. Per [spår 04 §Interaktions-
 * modell] valde instruktören tidigare karusell-ordningen själv — i den
 * nya split-vyn syns alla samtidigt, men prioritetsordningen styr ändå
 * default-focus och bana-ordning vänster→höger.
 */
export function sortByPriority(results: AARResult[]): AARResult[] {
  return [...results].sort((a, b) => {
    if (b.reds.length !== a.reds.length) return b.reds.length - a.reds.length;
    if (b.yellows.length !== a.yellows.length)
      return b.yellows.length - a.yellows.length;
    return a.lane - b.lane;
  });
}

export function severityOf(status: Status): Severity | null {
  if (status === "red") return "red";
  if (status === "yellow") return "yellow";
  return null;
}
