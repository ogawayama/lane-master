import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Container,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowUpward,
  ArrowDownward,
  Close,
  Add,
  Check,
  WarningAmber,
  DragIndicator,
} from "@mui/icons-material";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
 * Helhetsprototyp — PreparePage (M3-omskrivning 2026-05-28).
 *
 * Spår 01 — pre-pass preparation. MUI:
 *  - Catalog som Cards med outline/filled-tonal variants beroende på
 *    ready-status
 *  - Session plan med dnd-kit sortable (behåller) + IconButton för
 *    a11y-fallback
 *  - M3 FilledButton för start-CTA
 */

const TRAINING_TYPE_RANK: Record<CatalogExercise["trainingType"], number> = {
  basic: 0,
  advanced: 1,
  combat: 2,
};

function SortableSessionItem({
  id,
  item,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  id: string;
  item: ExerciseListItem;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
        display: "flex",
        alignItems: "center",
        gap: 1,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "var(--mui-palette-m3-surfaceContainer)",
        p: 1,
        pl: 0.5,
      }}
    >
      <IconButton
        {...attributes}
        {...listeners}
        size="small"
        aria-label="Drag to reorder"
        sx={{ width: 28, height: 40, cursor: "grab", "&:active": { cursor: "grabbing" }, touchAction: "none" }}
      >
        <DragIndicator fontSize="small" sx={{ color: "text.secondary" }} />
      </IconButton>
      <Typography
        sx={{
          width: 24,
          fontSize: 12,
          fontFamily: '"Roboto Mono", monospace',
          color: "text.secondary",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {index + 1}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.title}
        </Typography>
        <Typography sx={{ fontSize: 10, color: "text.secondary", fontFamily: '"Roboto Mono", monospace' }}>
          {item.weapon}
        </Typography>
      </Box>
      <IconButton size="small" disabled={index === 0} onClick={onMoveUp} aria-label="Move up" sx={{ width: 40, height: 40 }}>
        <ArrowUpward fontSize="small" />
      </IconButton>
      <IconButton size="small" disabled={index === total - 1} onClick={onMoveDown} aria-label="Move down" sx={{ width: 40, height: 40 }}>
        <ArrowDownward fontSize="small" />
      </IconButton>
      <IconButton size="small" onClick={onRemove} aria-label="Remove" sx={{ width: 40, height: 40, color: "text.secondary", "&:hover": { color: "error.main" } }}>
        <Close fontSize="small" />
      </IconButton>
    </Box>
  );
}

function CatalogRow({
  ex,
  ok,
  reason,
  already,
  onAdd,
}: {
  ex: CatalogExercise;
  ok: boolean;
  reason?: string;
  already: boolean;
  onAdd: () => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ layout: { duration: 0.35, ease: "easeOut" }, opacity: { duration: 0.2 } }}
      style={{ listStyle: "none" }}
    >
      <Card
        sx={{
          p: 1.5,
          bgcolor: ok ? "var(--mui-palette-m3-surfaceContainerLow)" : "var(--mui-palette-m3-surfaceContainerLowest)",
          border: 1,
          // Icke-redo kort: ingen synlig kant (de dimmas via opacity). Tidigare
          // rgba(255,255,255,0.05) var osynlig i ljust läge (prepare = ljus).
          borderColor: ok ? "divider" : "transparent",
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
          <Box sx={{ flex: 1, opacity: ok ? 1 : 0.5 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
              <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{ex.title}</Typography>
              <Typography sx={{ fontSize: 10, letterSpacing: "0.1em", color: "text.secondary", textTransform: "uppercase" }}>
                {ex.trainingType}
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>{ex.description}</Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", mt: 1, fontSize: 11, color: "text.secondary" }} useFlexGap>
              <span>Hits ≥ {ex.hits_threshold}</span>
              <span>Time ≤ {ex.time_seconds}s</span>
              <span>Spread ≤ {ex.spread_threshold}</span>
              <span style={{ fontFamily: '"Roboto Mono", monospace' }}>{ex.weaponTypes.join(" / ")}</span>
            </Stack>
            {!ok && reason && (
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: 1, color: "warning.main" }}>
                <WarningAmber sx={{ fontSize: 14 }} />
                <Typography sx={{ fontSize: 11 }}>{reason}</Typography>
              </Stack>
            )}
          </Box>
          <Button
            variant={already ? "contained" : "outlined"}
            color={already ? "secondary" : "primary"}
            size="small"
            disabled={already}
            onClick={onAdd}
            startIcon={already ? <Check /> : <Add />}
            sx={{ minHeight: 36, flexShrink: 0 }}
          >
            {already ? "Added" : "Add"}
          </Button>
        </Stack>
      </Card>
    </motion.li>
  );
}

export default function PreparePage() {
  const [searchParams] = useSearchParams();
  const section = (searchParams.get("section") ?? "idt") as Section;
  const navigate = useNavigate();
  const { session, loading } = useSession(section);
  const { availableTypes, loading: weaponsLoading } = useWeapons();

  const [list, setList] = useState<ExerciseListItem[]>([]);
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

  const { readyExercises, notReadyExercises } = useMemo(() => {
    const ready: { ex: CatalogExercise; reason?: string }[] = [];
    const notReady: { ex: CatalogExercise; reason?: string }[] = [];
    for (const ex of EXERCISE_CATALOG) {
      const { ok, reason } = exerciseRequiresWeaponType(ex, availableTypes);
      if (ok) ready.push({ ex });
      else notReady.push({ ex, reason });
    }
    ready.sort((a, b) => {
      const t = TRAINING_TYPE_RANK[a.ex.trainingType] - TRAINING_TYPE_RANK[b.ex.trainingType];
      if (t !== 0) return t;
      return EXERCISE_CATALOG.indexOf(a.ex) - EXERCISE_CATALOG.indexOf(b.ex);
    });
    return { readyExercises: ready, notReadyExercises: notReady };
  }, [availableTypes]);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setList((cur) => {
      const oldIndex = cur.findIndex((_, i) => `item-${i}` === active.id);
      const newIndex = cur.findIndex((_, i) => `item-${i}` === over.id);
      if (oldIndex < 0 || newIndex < 0) return cur;
      return arrayMove(cur, oldIndex, newIndex);
    });
  }

  async function startSession() {
    if (!session || list.length === 0) return;
    await setExerciseList(session.id, list);
    await setPhase(session.id, "select-exercise");
    navigate(`/tablet?section=${section}`);
  }

  if (loading) {
    return (
      <Stack sx={{ minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <Typography color="text.secondary">Loading session…</Typography>
      </Stack>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary", p: 3 }}>
      <Container maxWidth="xl" sx={{ px: 0 }}>
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 10, letterSpacing: "0.3em", color: "text.secondary", textTransform: "uppercase", mb: 0.5 }}>
            Tablet · {section.toUpperCase()} · Pre-pass preparation
          </Typography>
          <Stack direction="row" spacing={2} sx={{ alignItems: "baseline", justifyContent: "space-between" }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Build today's session
            </Typography>
            <Typography sx={{ fontSize: 14, color: "text.secondary", fontFamily: '"Roboto Mono", monospace' }}>
              Roster · {traineeCount === null ? "…" : `${traineeCount} in pool`}
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 14, color: "text.secondary", mt: 0.5 }}>
            Pick exercises in the order you want to run them. Weapons that aren't ready in the studio are dimmed — you can override.
          </Typography>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 440px" }, gap: 3 }}>
          {/* Catalog */}
          <Box>
            <Typography sx={{ fontSize: 11, letterSpacing: "0.15em", color: "text.secondary", textTransform: "uppercase", mb: 1 }}>
              Exercise catalog
            </Typography>
            <Stack component="ul" spacing={1} sx={{ p: 0, m: 0 }}>
              <AnimatePresence>
                {readyExercises.map(({ ex }) => (
                  <CatalogRow
                    key={ex.id}
                    ex={ex}
                    ok
                    reason={undefined}
                    already={inList.has(ex.id)}
                    onAdd={() => addExercise(ex)}
                  />
                ))}
              </AnimatePresence>
            </Stack>

            {notReadyExercises.length > 0 && (
              <>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mt: 3, mb: 1.5 }} component={motion.div} layout>
                  <Box sx={{ flex: 1, height: 1, bgcolor: "divider" }} />
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", color: "warning.main", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    <WarningAmber sx={{ fontSize: 12 }} />
                    <span>Not currently available · weapons need to be ready first</span>
                  </Stack>
                  <Box sx={{ flex: 1, height: 1, bgcolor: "divider" }} />
                </Stack>
                <Stack component="ul" spacing={1} sx={{ p: 0, m: 0 }}>
                  <AnimatePresence>
                    {notReadyExercises.map(({ ex, reason }) => (
                      <CatalogRow
                        key={ex.id}
                        ex={ex}
                        ok={false}
                        reason={reason}
                        already={inList.has(ex.id)}
                        onAdd={() => addExercise(ex)}
                      />
                    ))}
                  </AnimatePresence>
                </Stack>
              </>
            )}

            {weaponsLoading && (
              <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 1 }}>
                Reading weapon status…
              </Typography>
            )}
          </Box>

          {/* Ordered list */}
          <Box>
            <Box sx={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 11, letterSpacing: "0.15em", color: "text.secondary", textTransform: "uppercase", mb: 1 }}>
                  Session plan ({list.length})
                </Typography>
                {list.length === 0 ? (
                  <Box
                    sx={{
                      borderRadius: 2,
                      border: 1,
                      borderStyle: "dashed",
                      borderColor: "divider",
                      p: 3,
                      textAlign: "center",
                      fontSize: 14,
                      color: "text.secondary",
                    }}
                  >
                    Empty. Add exercises from the catalog.
                  </Box>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={list.map((_, i) => `item-${i}`)} strategy={verticalListSortingStrategy}>
                      <Stack spacing={1}>
                        {list.map((item, idx) => (
                          <SortableSessionItem
                            key={`${item.id}-${idx}`}
                            id={`item-${idx}`}
                            item={item}
                            index={idx}
                            total={list.length}
                            onMoveUp={() => moveAt(idx, -1)}
                            onMoveDown={() => moveAt(idx, 1)}
                            onRemove={() => removeAt(idx)}
                          />
                        ))}
                      </Stack>
                    </SortableContext>
                  </DndContext>
                )}
              </Box>

              <Button
                variant="contained"
                fullWidth
                size="large"
                disabled={list.length === 0 || !session}
                onClick={() => void startSession()}
                sx={{ minHeight: 48 }}
              >
                Start session → Pick on the duk
              </Button>
              {session && session.phase !== "idle" && session.phase !== "prepare" && (
                <Alert severity="warning" sx={{ fontSize: 11 }}>
                  A session is already running (phase: {session.phase}). Starting a new one will interrupt it.
                </Alert>
              )}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
