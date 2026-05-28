import { Link, useSearchParams } from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  Card,
  Container,
  Stack,
  Toolbar,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Collapse,
} from "@mui/material";
import { useState } from "react";
import { useSession } from "@/hooks/useSession";
import {
  setPhase,
  type Section,
  type SessionPhase,
} from "@/services/sessionService";
import { DARTablet } from "@/components/prototyp/DARTablet";
import { MiniBangridTablet } from "@/components/prototyp/MiniBangridTablet";
import { MiniAARTablet } from "@/components/prototyp/MiniAARTablet";
import type { Section as LaneSection } from "@/services/assignmentService";

/**
 * Helhetsprototyp — TabletShell (M3-omskrivning 2026-05-28).
 *
 * M3 AppBar för shell-chrome. Phase-medveten med mini-mirrors per fas.
 * MUI ToggleButtonGroup för debug-phase-controls (M3 segmented button).
 */

const PHASES: SessionPhase[] = [
  "idle",
  "prepare",
  "check-in",
  "preflight",
  "exercise",
  "aar",
  "ended",
];

export default function TabletShell() {
  const [searchParams] = useSearchParams();
  const section = (searchParams.get("section") ?? "idt") as Section;
  const { session, loading } = useSession(section);
  const [debugOpen, setDebugOpen] = useState(false);

  if (loading) {
    return (
      <Stack sx={{ minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <Typography color="text.secondary">Connecting…</Typography>
      </Stack>
    );
  }

  if (session && session.phase === "exercise") {
    return <DARTablet sessionId={session.id} section={section} />;
  }

  const showPrepareCta =
    !session || session.phase === "idle" || session.phase === "prepare";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "var(--mui-palette-m3-surfaceContainer)",
          color: "text.primary",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 10, letterSpacing: "0.3em", color: "text.secondary", textTransform: "uppercase" }}>
              Tablet · {section.toUpperCase()}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Instructor control
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
        <Typography color="text.secondary" sx={{ mb: 3, fontSize: 14 }}>
          Phase-aware. Real surfaces appear during their phase; phase-controls
          below for debugging.
        </Typography>

        {showPrepareCta && (
          <Card
            component={Link}
            to={`/tablet/prepare?section=${section}`}
            sx={{
              display: "block",
              p: 2.5,
              mb: 3,
              border: 2,
              borderColor: "primary.main",
              bgcolor: "var(--mui-palette-m3-primaryContainer)",
              color: "var(--mui-palette-m3-onPrimaryContainer)",
              textDecoration: "none",
              transition: "filter 150ms",
              "&:hover": { filter: "brightness(1.1)" },
            }}
          >
            <Typography sx={{ fontSize: 10, letterSpacing: "0.3em", color: "primary.main", textTransform: "uppercase", mb: 0.5 }}>
              Pre-pass · spår 01
            </Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 500 }}>
              Build today's session →
            </Typography>
            <Typography sx={{ fontSize: 14, color: "text.secondary", mt: 0.5 }}>
              Pick exercises in order before trainees arrive.
            </Typography>
          </Card>
        )}

        {/* Phase-specifika paneler */}
        {session && session.phase === "select-exercise" && (
          <WaitingPanel
            title="Pick on the projector"
            body="The exercise carousel is showing on the projector. Use ◀ ▶ to navigate and OK to select the starting exercise."
          />
        )}
        {session && session.phase === "check-in" && (
          <MiniBangridTablet section={section as unknown as LaneSection} />
        )}
        {session && session.phase === "preflight" && (
          <WaitingPanel
            title="Briefing on the screen"
            body="The criteria screen is showing on the projector. Press OK on the remote to start the exercise."
          />
        )}
        {session && session.phase === "aar" && (
          <MiniAARTablet
            exercise={session.exercise_list[session.current_exercise_index] ?? null}
            section={section}
          />
        )}
        {session && session.phase === "ended" && (
          <WaitingPanel
            title="Session ended"
            body="All exercises done. Reset from /wizard to start over."
          />
        )}

        {/* Debug-panel — M3 segmented button-stil */}
        <Box sx={{ mt: 4 }}>
          <Button
            size="small"
            variant="text"
            onClick={() => setDebugOpen((v) => !v)}
            sx={{
              fontSize: 11,
              letterSpacing: "0.15em",
              color: "text.secondary",
              textTransform: "uppercase",
            }}
          >
            {debugOpen ? "▾" : "▸"} Debug · phase controls
          </Button>
          <Collapse in={debugOpen}>
            <Card sx={{ p: 2.5, mt: 1, bgcolor: "var(--mui-palette-m3-surfaceContainerLow)" }}>
              <Typography sx={{ fontSize: 11, letterSpacing: "0.15em", color: "text.secondary", textTransform: "uppercase", mb: 1 }}>
                Current phase
              </Typography>
              <Typography sx={{ fontSize: 22, fontFamily: '"Roboto Mono", monospace', mb: 2 }}>
                {session?.phase ?? "no session"}
              </Typography>
              <ToggleButtonGroup
                value={session?.phase}
                exclusive
                onChange={(_, val) => {
                  if (val && session) void setPhase(session.id, val as SessionPhase);
                }}
                size="small"
                sx={{ flexWrap: "wrap", gap: 0.5 }}
              >
                {PHASES.map((p) => (
                  <ToggleButton
                    key={p}
                    value={p}
                    disabled={!session}
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: "10px !important",
                      textTransform: "none",
                      fontSize: 12,
                      px: 1.5,
                      py: 0.5,
                    }}
                  >
                    {p}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Card>
          </Collapse>
        </Box>
      </Container>
    </Box>
  );
}

function WaitingPanel({ title, body }: { title: string; body: string }) {
  return (
    <Card sx={{ p: 2.5, bgcolor: "var(--mui-palette-m3-surfaceContainerLow)" }}>
      <Typography sx={{ fontSize: 11, letterSpacing: "0.3em", color: "text.secondary", textTransform: "uppercase", mb: 1 }}>
        On the projector now
      </Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 600, mb: 0.5 }}>{title}</Typography>
      <Typography sx={{ fontSize: 14, color: "text.secondary" }}>{body}</Typography>
    </Card>
  );
}
