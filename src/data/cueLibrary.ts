/**
 * Helhetsprototyp — pick-up-line-bibliotek (Pass 6).
 *
 * Per [spår 04 §Cue-principen 2026-05-25]: en pick-up-line är ett
 * konkret avstamp för instruktören — INTE ett manus att läsa upp.
 * Systemet genererar formuleringen så även en oerfaren instruktör
 * vet *var* hen ska börja samtalet. Instruktören riffar på det.
 *
 * Alla röda kriterier får en cue, alla — inte bara det högst prio.
 * Severity = 'red' eller 'yellow' (gröna behöver ingen cue).
 *
 * Deterministisk val per (lane, exercise, criterion, severity)
 * görs i AARDuk så cue:n inte ändras när instruktören navigerar
 * fram-och-tillbaka i karusellen.
 */

export type Criterion = "hit" | "time" | "spread";
export type Severity = "red" | "yellow";

type CueMap = Record<Criterion, Record<Severity, string[]>>;

export const CUE_LIBRARY: CueMap = {
  hit: {
    red: [
      "Hits short of the mark. Let's look at the sight picture together.",
      "Several shots off target. What did you see right before each one?",
      "Hit count is below threshold — talk to me about your follow-through.",
      "We're missing more than we should. Pick one shot you remember best and walk me through it.",
      "Hit-rate is low this round. Was something throwing off your aim?",
    ],
    yellow: [
      "Hits are close to the line — small adjustment could get you over.",
      "Almost there on hits. What's the one thing you'd change next round?",
      "You're hovering at the threshold. Trigger control or sight picture — which felt weaker?",
    ],
  },
  time: {
    red: [
      "Took longer than the target time. What slowed you down — target acquisition or shot setup?",
      "Time is over. Was it the first shot or the transitions between shots that took it?",
      "Pace was slow this round. Where in the sequence did you feel uncertain?",
      "Engagement time blew the threshold. Let's break the sequence into pieces.",
    ],
    yellow: [
      "Pace was OK but not crisp. Where could you have moved sooner?",
      "Time is borderline. Next round, try committing to the first shot earlier.",
      "Borderline on time. The bottleneck — was it sights or trigger?",
    ],
  },
  spread: {
    red: [
      "Group is wide. Grip pressure or stance — which felt off?",
      "Spread is large. Let's look at where your shots landed and find the pattern.",
      "Wide group. Talk me through how you reset between shots.",
      "Pattern is scattered. Recoil management is the usual suspect — how did the gun feel?",
    ],
    yellow: [
      "Group is a bit loose. One slight tweak should bring it in.",
      "Spread is over but not by much. Pull the shots together with breath control.",
      "Borderline group. Is one shot pulling the average — or are they all just slightly wide?",
    ],
  },
};

/** Deterministic pick — same input → same cue, so navigating back shows the same line. */
export function pickCue(
  lane: number,
  exerciseId: string,
  criterion: Criterion,
  severity: Severity,
): string {
  const lines = CUE_LIBRARY[criterion][severity];
  if (lines.length === 0) return "";
  // Mix seed across all inputs so different combos pick different lines.
  let seed = lane * 9301 + 49297;
  for (const ch of exerciseId) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
  for (const ch of criterion) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
  for (const ch of severity) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
  const idx = Math.abs(seed) % lines.length;
  return lines[idx];
}
