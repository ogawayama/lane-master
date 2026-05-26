/**
 * Helhetsprototyp — statisk övningskatalog (Pass 2).
 *
 * Härledd från kontext.md §4 (GC IDT vapenportfölj + träningstyper).
 * Statisk i kod för prototypen; flyttas till DB om/när spår 01 visar
 * att övningar behöver redigeras utanför kod.
 *
 * `weaponTypes` listar tillåtna typer (matchar weapons.weapon_type i DB).
 * Kriterier från spår 04:s modell (Hits / Time / Spread).
 */

export interface CatalogExercise {
  id: string;
  title: string;
  description: string;
  trainingType: "basic" | "advanced" | "combat";
  weaponTypes: string[]; // accepterar vilka vapen-typer som helst i listan
  hits_threshold: number;
  time_seconds: number;
  spread_threshold: number;
}

export const EXERCISE_CATALOG: CatalogExercise[] = [
  {
    id: "basic-glock-paper",
    title: "Basic accuracy — Glock paper target",
    description: "5 shots at static paper. Foundation for sight picture and trigger control.",
    trainingType: "basic",
    weaponTypes: ["Glock 17", "pistol"],
    hits_threshold: 4,
    time_seconds: 60,
    spread_threshold: 15,
  },
  {
    id: "basic-ar15-paper",
    title: "Basic accuracy — AR15 paper target",
    description: "10 shots, single-target rifle baseline.",
    trainingType: "basic",
    weaponTypes: ["AR15", "rifle"],
    hits_threshold: 8,
    time_seconds: 75,
    spread_threshold: 20,
  },
  {
    id: "basic-rk-paper",
    title: "Basic accuracy — RK 62/95 paper target",
    description: "10 shots, sight zero verification.",
    trainingType: "basic",
    weaponTypes: ["RK95", "rifle"],
    hits_threshold: 8,
    time_seconds: 75,
    spread_threshold: 20,
  },
  {
    id: "adv-3d-rifle",
    title: "Advanced — 3D targets, rifle",
    description: "6 reactive 3D targets, transition drill.",
    trainingType: "advanced",
    weaponTypes: ["AR15", "RK95", "rifle", "Colt M4"],
    hits_threshold: 5,
    time_seconds: 45,
    spread_threshold: 25,
  },
  {
    id: "adv-3d-pistol",
    title: "Advanced — 3D targets, pistol",
    description: "Speed engagement, pistol.",
    trainingType: "advanced",
    weaponTypes: ["Glock 17", "pistol"],
    hits_threshold: 5,
    time_seconds: 40,
    spread_threshold: 22,
  },
  {
    id: "cg-heat-single",
    title: "CG M4 — HEAT 551 single target",
    description: "Anti-tank engagement, stationary target at 200m.",
    trainingType: "advanced",
    weaponTypes: ["CG M4"],
    hits_threshold: 1,
    time_seconds: 90,
    spread_threshold: 30,
  },
  {
    id: "cg-hedp-bunker",
    title: "CG M4 — HEDP 502 against bunker",
    description: "Multi-purpose round, fortified position.",
    trainingType: "advanced",
    weaponTypes: ["CG M4"],
    hits_threshold: 1,
    time_seconds: 120,
    spread_threshold: 35,
  },
  {
    id: "at4-direct",
    title: "AT4 CS — direct engagement",
    description: "Single-shot anti-tank, moving target 100m.",
    trainingType: "advanced",
    weaponTypes: ["AT4"],
    hits_threshold: 1,
    time_seconds: 60,
    spread_threshold: 25,
  },
  {
    id: "combat-room-clear",
    title: "Combat — room clearance, mixed targets",
    description: "Squad-level, mixed friendly/hostile 3D entities.",
    trainingType: "combat",
    weaponTypes: ["AR15", "RK95", "Colt M4", "rifle"],
    hits_threshold: 6,
    time_seconds: 90,
    spread_threshold: 30,
  },
  {
    id: "combat-defense",
    title: "Combat — fixed-position defense",
    description: "Cover and fire, multiple wave attack.",
    trainingType: "combat",
    weaponTypes: ["AR15", "RK95", "Colt M4", "rifle"],
    hits_threshold: 10,
    time_seconds: 120,
    spread_threshold: 35,
  },
];

/** Vilka vapen-typer som krävs av övningen, kontrollerat mot DB:s weapons. */
export function exerciseRequiresWeaponType(
  exercise: CatalogExercise,
  availableTypes: Set<string>,
): { ok: boolean; reason?: string } {
  const match = exercise.weaponTypes.some((t) => availableTypes.has(t));
  if (match) return { ok: true };
  return {
    ok: false,
    reason: `Requires ${exercise.weaponTypes.join(" or ")} — none currently ready in this studio.`,
  };
}
