import type { ExerciseListItem } from "@/services/sessionService";
import type { Criterion, Severity } from "@/data/cueLibrary";

/**
 * Helhetsprototyp — AAR-resultat (Pass 6).
 *
 * Per [helhetsprototyp/plan.md §5 Pass 6 + §2]: vi har ingen
 * sensordata att gå mot än. Genererar därför deterministiska
 * mock-resultat per (lane, exercise) — så samma skytt på samma
 * övning alltid ger samma siffror och färger.
 *
 * När riktig sensor-pipeline finns: ersätt computeResult() med
 * en query mot exercise_runs-tabellen (skapas i Pass 7 om
 * persistens behövs mellan övningar).
 *
 * Triage-scoring per [spår 04 § Hypotes + § Riskigaste antagandet]:
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
}

/** Deterministic LCG seeded by lane × exercise id. */
function seed(lane: number, exerciseId: string): number {
  let s = lane * 9301 + 49297;
  for (const ch of exerciseId) s = (s * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(s);
}

function lcg(s: number): () => number {
  let state = s;
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
  const rand = lcg(seed(lane, exercise.id));

  // Generate values around the threshold with some spread so we get a
  // mix of green/yellow/red across lanes (instructive for a demo AAR).
  const hits_th = exercise.hits_threshold ?? 5;
  const time_th = exercise.time_seconds ?? 60;
  const spread_th = exercise.spread_threshold ?? 20;

  const hits = Math.max(0, Math.round(hits_th * (0.5 + rand() * 0.7))); // 50-120% of threshold
  const time = Math.round(time_th * (0.7 + rand() * 0.7)); // 70-140%
  const spread = Math.round(spread_th * (0.6 + rand() * 0.8)); // 60-140%

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
  };
}

/** Sort trainees so the most-red comes first — free ingångspunkt
 *  per [spår 04 §Interaktionsmodell — karusell 2026-05-25]:
 *  instruktören börjar typiskt på största behovet, men kan navigera
 *  fritt med ◀ ▶. */
export function sortByPriority(results: AARResult[]): AARResult[] {
  return [...results].sort((a, b) => {
    // More reds first; tie: lower lane number first.
    if (b.reds.length !== a.reds.length) return b.reds.length - a.reds.length;
    return a.lane - b.lane;
  });
}

export function severityOf(status: Status): Severity | null {
  if (status === "red") return "red";
  if (status === "yellow") return "yellow";
  return null;
}
