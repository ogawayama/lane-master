import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUp, ArrowDown, X, Plus, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { useWeapons } from "@/hooks/useWeapons";
import {
  setExerciseList,
  setPhase,
  type ExerciseListItem,
  type Section,
} from "@/services/sessionService";
import {
  EXERCISE_CATALOG,
  exerciseRequiresWeaponType,
  type CatalogExercise,
} from "@/data/exerciseCatalog";
import { listAll } from "@/services/userHubService";

/**
 * Helhetsprototyp — PreparePage (Pass 2).
 *
 * Spår 01 — pre-pass preparation vid skrivbordet. Instruktören:
 *  1. Ser hur många skyttar finns i registret (User Hub-info)
 *  2. Bläddrar bland tillgängliga övningar
 *  3. Bygger en ordnad lista (lägg till, flytta upp/ner, ta bort)
 *  4. Startar sessionen → setExerciseList + setPhase('check-in')
 *
 * Filtering-principen från spår 01: övningar vars vapen *inte* är ready
 * gråas ut + visar "varför inte" — men kan fortfarande klickas (medveten
 * override per [spår 01 §Samlad position varv 2]).
 *
 * Designspråk: "kontrollrum" — tätt, status-bärande. Ej för duken.
 */

export default function PreparePage() {
  const [searchParams] = useSearchParams();
  const section = (searchParams.get("section") ?? "idt") as Section;
  const navigate = useNavigate();
  const { session, loading } = useSession(section);
  const { availableTypes, loading: weaponsLoading } = useWeapons();

  // Lokal lista i ordning. Synkad till session.exercise_list när vi sparar.
  const [list, setList] = useState<ExerciseListItem[]>([]);
  // Initiera från sessionen (om instruktören är mitt i en redigering)
  useEffect(() => {
    if (session && session.exercise_list.length > 0 && list.length === 0) {
      setList(session.exercise_list);
    }
  }, [session, list.length]);

  const [traineeCount, setTraineeCount] = useState<number | null>(null);
  useEffect(() => {
    void listAll().then((users) => setTraineeCount(users.length));
  }, []);

  const inList = useMemo(() => new Set(list.map((e) => e.id)), [list]);

  function addExercise(ex: CatalogExercise) {
    setList((cur) => [
      ...cur,
      {
        id: ex.id,
        title: ex.title,
        weapon: ex.weaponTypes[0],
        hits_threshold: ex.hits_threshold,
        time_seconds: ex.time_seconds,
        spread_threshold: ex.spread_threshold,
      },
    ]);
  }

  function removeAt(idx: number) {
    setList((cur) => cur.filter((_, i) => i !== idx));
  }

  function moveAt(idx: number, dir: -1 | 1) {
    setList((cur) => {
      const next = [...cur];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return cur;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function startSession() {
    if (!session || list.length === 0) return;
    await setExerciseList(session.id, list);
    await setPhase(session.id, "check-in");
    navigate(`/tablet?section=${section}`);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading session…</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <header className="max-w-6xl mx-auto mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
          Tablet · {section.toUpperCase()} · Pre-pass preparation
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold">Build today's session</h1>
          <div className="text-sm text-muted-foreground font-mono">
            {traineeCount === null ? "…" : `${traineeCount} trainees in roster`}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Pick exercises in the order you want to run them. Weapons that aren't ready in the studio are dimmed — you can override.
        </p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_440px] gap-6">
        {/* Catalog */}
        <section>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Exercise catalog
          </div>
          <ul className="space-y-2">
            {EXERCISE_CATALOG.map((ex) => {
              const { ok, reason } = exerciseRequiresWeaponType(ex, availableTypes);
              const already = inList.has(ex.id);
              return (
                <li
                  key={ex.id}
                  className={`group rounded-lg border p-3 transition-colors ${
                    ok ? "border-border bg-card" : "border-border/50 bg-card/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-1 ${ok ? "" : "opacity-50"}`}>
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium">{ex.title}</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {ex.trainingType}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{ex.description}</div>
                      <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
                        <span>Hits ≥ {ex.hits_threshold}</span>
                        <span>Time ≤ {ex.time_seconds}s</span>
                        <span>Spread ≤ {ex.spread_threshold}</span>
                        <span className="font-mono">{ex.weaponTypes.join(" / ")}</span>
                      </div>
                      {!ok && (
                        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-500">
                          <AlertCircle className="h-3 w-3" />
                          {reason}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={already ? "secondary" : "outline"}
                      disabled={already}
                      onClick={() => addExercise(ex)}
                      className="shrink-0"
                    >
                      {already ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {already ? "Added" : "Add"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          {weaponsLoading && (
            <div className="text-xs text-muted-foreground mt-2">Reading weapon status…</div>
          )}
        </section>

        {/* Ordered list */}
        <aside>
          <div className="sticky top-6 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Session plan ({list.length})
              </div>
              {list.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Empty. Add exercises from the catalog.
                </div>
              ) : (
                <ol className="space-y-2">
                  {list.map((item, idx) => (
                    <li
                      key={`${item.id}-${idx}`}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card p-3"
                    >
                      <div className="text-xs font-mono w-5 text-muted-foreground">{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{item.title}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {item.weapon}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={idx === 0}
                        onClick={() => moveAt(idx, -1)}
                        className="h-7 w-7"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={idx === list.length - 1}
                        onClick={() => moveAt(idx, 1)}
                        className="h-7 w-7"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeAt(idx)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={list.length === 0 || !session}
              onClick={() => void startSession()}
            >
              Start session → Check-in
            </Button>
            {session && session.phase !== "idle" && session.phase !== "prepare" && (
              <div className="text-[11px] text-amber-500 text-center">
                Active session is in <code>{session.phase}</code>. Starting will reset to check-in.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
