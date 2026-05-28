import type { ExerciseListItem } from "@/services/sessionService";

/**
 * Helhetsprototyp — shotSimulation (introducerad 2026-05-28).
 *
 * Deterministisk skott-sekvens per (lane, exercise.id). Samma instans
 * konsumeras av:
 *   • SimulationDuk under exercise-fasen — skotten dyker upp över tid
 *     på papptavlor per bana, "live"
 *   • AARDuk efter rundan — visar det slutgiltiga mönstret + härleder
 *     metrics (hits-count, spread) från samma mönster
 *
 * Konsekvens: instruktör och skytt ser samma bild från live → review
 * utan diskontinuitet. Numbers stämmer med vad ögat såg.
 *
 * Koordinatsystem: x/y i procent från target-centrum (-50..+50).
 * Träffytan är ungefär ±25% från centrum.
 */

export interface Shot {
  /** Sekvens-index 0..n-1 inom sequence. */
  i: number;
  /** Procent från target-centrum, x (-50..+50). */
  x: number;
  /** Procent från target-centrum, y (-50..+50). */
  y: number;
  /** Träff = inom HIT_RADIUS från centrum + accuracy-modifierare. */
  hit: boolean;
  /** Millisekunder från övningens start då skottet faller. */
  at_ms: number;
}

export interface ShotSequence {
  shots: Shot[];
  total_shots: number;
  total_duration_ms: number;
  /** Härledd från träffmönstret — max radie i % som rymmer träffarna. */
  spread_pct: number;
}

/** Inom denna radie räknas skottet som träff (procent från target-centrum). */
const HIT_RADIUS = 25;

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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Bygg en stabil skott-sekvens för en (lane, exercise)-kombination.
 *
 * Givet samma inparametrar returneras samma sekvens — säkert att kalla
 * från flera ställen utan att mönstret driver.
 */
export function buildShotSequence(
  lane: number,
  exercise: Pick<ExerciseListItem, "id" | "hits_threshold" | "time_seconds">,
): ShotSequence {
  const rand = lcg(seedFor(lane, exercise.id));

  // Antal totala skott runt threshold. Vissa skyttar skjuter fler/färre.
  const targetHits = exercise.hits_threshold ?? 5;
  const totalShots = Math.max(3, targetHits + Math.round((rand() - 0.5) * 4));

  // "Skicklighet" per skytt — bestämmer hur tight mönstret blir.
  // 0.25 = väldigt skicklig (tight), 1.0 = spridd. Seedat per (lane, ex)
  // så samma skytt på samma övning ger samma resultat.
  const skill = 0.25 + rand() * 0.85;

  // Accuracy — sannolikhet att ett "siktat rätt"-skott faktiskt
  // landar inom HIT_RADIUS. Tillsammans med skill ger detta variation
  // i grön/gul/röd mellan banor.
  const accuracy = 0.35 + rand() * 0.65;

  // Övningstid (ms) — skotten sprids över ~85% av tiden, med liten
  // försening i början (instruktören startar, skytten siktar).
  const totalMs = (exercise.time_seconds ?? 60) * 1000;
  const shootingWindow = totalMs * 0.85;
  const startOffset = totalMs * 0.05;

  const shots: Shot[] = [];
  for (let i = 0; i < totalShots; i++) {
    // Pseudo-gaussisk fördelning via Box-Muller, skalad med skill.
    const u1 = Math.max(0.001, rand());
    const u2 = rand();
    const radius = Math.sqrt(-2 * Math.log(u1)) * skill * 16;
    const angle = u2 * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const dist = Math.sqrt(x * x + y * y);

    // Träff = inom HIT_RADIUS *och* accuracy-test ok. Det andra ledet
    // gör att högt accuracy ger fler träffar även när spridningen är
    // borderline — separerar "kan sikta" från "kan hålla tight".
    const hit = dist <= HIT_RADIUS && rand() < accuracy;

    // Tid — jämnt fördelade skott med liten jitter (rytm).
    const baseT = startOffset + (shootingWindow * (i + 0.5)) / totalShots;
    const jitter = (rand() - 0.5) * 800;

    shots.push({
      i,
      x: clamp(x, -45, 45),
      y: clamp(y, -45, 45),
      hit,
      at_ms: Math.max(0, Math.round(baseT + jitter)),
    });
  }

  shots.sort((a, b) => a.at_ms - b.at_ms);

  // Härled spread från träffmönstret: max avstånd från träffarnas
  // tyngdpunkt. Saknar träffar → 0.
  const hitShots = shots.filter((s) => s.hit);
  let spreadPct = 0;
  if (hitShots.length > 0) {
    const cx = hitShots.reduce((acc, s) => acc + s.x, 0) / hitShots.length;
    const cy = hitShots.reduce((acc, s) => acc + s.y, 0) / hitShots.length;
    spreadPct = Math.max(
      ...hitShots.map((s) => Math.sqrt((s.x - cx) ** 2 + (s.y - cy) ** 2)),
    );
  }

  return {
    shots,
    total_shots: totalShots,
    total_duration_ms: totalMs,
    spread_pct: spreadPct,
  };
}
