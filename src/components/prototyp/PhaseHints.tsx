/**
 * Helhetsprototyp — PhaseHints (introducerad 2026-05-28).
 *
 * Enhetlig hint-rad nederst på duken som visar tillgängliga fjärrknappar
 * i aktuell fas. Per UX-review 2026-05-28: tidigare fanns hint-rader bara
 * på Kriterie/Simulation/AAR (inkonsekvent), och Bangrid/SelectExercise
 * krävde att instruktören minns grammatiken.
 *
 * Använd <PhaseHints hints={[...]}/> längst ner i varje duk-vy. Stilen
 * matchar duk-språket ("biograf"): låg vikt, generöst spacing, läsbart
 * på 10 fot via konsekvent storlek över alla faser.
 */

export interface RemoteKeyHint {
  /** Knapp(ar) som visas som kbd-style chip(s). T.ex. ["◀", "▶"] eller ["OK"]. */
  keys: string[];
  /** Kort åtgärdsbeskrivning. T.ex. "select trainee", "next exercise". */
  label: string;
  /** Optional: starkare visuell vikt (för fasens primära action). */
  primary?: boolean;
}

export function PhaseHints({ hints }: { hints: RemoteKeyHint[] }) {
  if (hints.length === 0) return null;
  return (
    <div className="px-12 pb-7 flex items-center justify-center gap-7 text-white/45 text-[11px] uppercase tracking-[0.3em]">
      {hints.map((h, i) => (
        <span key={`${h.label}-${i}`} className="contents">
          {i > 0 && <span className="text-white/15">·</span>}
          <Hint hint={h} />
        </span>
      ))}
    </div>
  );
}

function Hint({ hint }: { hint: RemoteKeyHint }) {
  const keyTone = hint.primary
    ? "border-white/55 text-white/85"
    : "border-white/25 text-white/55";
  const labelTone = hint.primary ? "text-white/70" : "text-white/45";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1">
        {hint.keys.map((k) => (
          <span
            key={k}
            className={`inline-flex items-center justify-center h-7 min-w-[28px] px-2 rounded border font-mono text-[11px] ${keyTone}`}
          >
            {k}
          </span>
        ))}
      </span>
      <span className={labelTone}>{hint.label}</span>
    </span>
  );
}
