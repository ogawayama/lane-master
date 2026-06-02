import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Box,
  Button,
  Card,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Shield,
  WarningAmber,
  CheckCircle,
} from "@mui/icons-material";
import rfidReaderImg from "@/assets/rfid-reader.png";
import { RegistrationForm } from "@/components/RegistrationForm";
import { RFIDSimulator } from "@/components/RFIDSimulator";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import {
  lookupUserByRfid,
  assignLaneAndWeapon,
  registerUser,
  relinkRfid,
  resetAllAssignments,
  type AssignmentResult,
  type Section,
  type User,
} from "@/services/assignmentService";

/**
 * LoginScreen — M3-omskrivning 2026-05-28.
 *
 * RFID check-in-terminal. M3-stil med:
 *  - Shield ikon + Display-typ för "Scan Your RFID Tag"
 *  - MUI Cards för success/error/register states (M3 tonal containers)
 *  - MUI Button för confirm
 *  - RegistrationForm/RFIDSimulator/ConnectionStatus ärvs orörda (de
 *    är egna komponenter och håller sin egen interna stil)
 */

type ScreenState = "idle" | "loading" | "success" | "error" | "register";

interface LoginScreenProps {
  heading?: string;
  themeHsl?: string;
  section?: Section;
}

export default function LoginScreen({
  heading = "GUNNERY & SKILLS",
  themeHsl,
  section = "idt",
}: LoginScreenProps = {}) {
  const [state, setState] = useState<ScreenState>("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<AssignmentResult | null>(null);
  const [pendingRfid, setPendingRfid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const inputRef = useRef<HTMLInputElement>(null);

  const dismissSuccess = useCallback(() => {
    setState("idle");
    setMessage("");
    setResult(null);
    setCountdown(10);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (state !== "success") return;
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          dismissSuccess();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state, dismissSuccess]);

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (state === "register") return;
    focusInput();
    const interval = setInterval(focusInput, 2000);
    return () => clearInterval(interval);
  }, [focusInput, state]);

  const handleScan = async (rfid: string) => {
    if (!rfid.trim() || isLoading) return;
    setState("loading");
    setIsLoading(true);
    setMessage("");
    try {
      const user = await lookupUserByRfid(rfid.trim());
      if (user) {
        const result: AssignmentResult = await assignLaneAndWeapon(user, section);
        setResult(result);
        setState(result.success ? "success" : "error");
        setMessage(result.message);
        if (!result.success) {
          setTimeout(() => {
            setState("idle"); setMessage(""); setResult(null); focusInput();
          }, 6000);
        }
      } else {
        setPendingRfid(rfid.trim());
        setState("register");
        setMessage("RFID not registered. Register RFID tag.");
      }
    } catch (err) {
      setState("error");
      setMessage("System error. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: { name: string }) => {
    setIsLoading(true);
    try {
      const { user, error } = await registerUser({ ...data, rfid: pendingRfid });
      if (!user) {
        setState("error");
        setMessage(error ? `Registration failed: ${error}` : "Registration failed.");
        return;
      }
      const result = await assignLaneAndWeapon(user, section);
      setResult(result);
      setState(result.success ? "success" : "error");
      setMessage(result.message);
      if (!result.success) {
        setTimeout(() => { setState("idle"); setMessage(""); setResult(null); focusInput(); }, 6000);
      }
    } catch (err) {
      setState("error");
      setMessage("Registration error. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLink = async (user: User) => {
    setIsLoading(true);
    try {
      const updated = await relinkRfid(user.id, pendingRfid);
      if (!updated) {
        setState("error");
        setMessage("Failed to link RFID. Please try again.");
        return;
      }
      const result = await assignLaneAndWeapon(updated, section);
      setResult(result);
      setState(result.success ? "success" : "error");
      setMessage(result.message);
      if (!result.success) {
        setTimeout(() => { setState("idle"); setMessage(""); setResult(null); focusInput(); }, 6000);
      }
    } catch (err) {
      setState("error");
      setMessage("Linking error. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRegistration = () => {
    setState("idle"); setMessage(""); setPendingRfid(""); focusInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = (e.target as HTMLInputElement).value;
      (e.target as HTMLInputElement).value = "";
      if (state === "success") { dismissSuccess(); return; }
      handleScan(val);
    }
  };

  // Under Saab: enad brand — tvinga Tailwind-`--primary` (sub-widgets som
  // RFIDSimulator/RegistrationForm) till Saab-gult, så section-hue (grön/röd)
  // inte krockar med MUI-temats gula primary. MUI-delarna är redan gula.
  const muiTheme = useTheme();
  const isSaab = (muiTheme.palette as { m3?: { brand?: string } }).m3?.brand === "saab";
  const SAAB_PRIMARY_HSL = "44 100% 49%"; // ≈ #FAB900
  const effectiveHsl = isSaab ? SAAB_PRIMARY_HSL : themeHsl;
  const themeStyle = effectiveHsl
    ? ({ ["--primary" as string]: effectiveHsl, ["--ring" as string]: effectiveHsl } as React.CSSProperties)
    : undefined;

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 4,
      }}
      style={themeStyle}
      onClick={() => state !== "register" && focusInput()}
    >
      <Stack direction="row" spacing={1.5} sx={{ position: "absolute", top: 24, left: 32, alignItems: "center" }}>
        <Shield sx={{ color: "primary.main", fontSize: 32 }} />
        <Typography sx={{ fontWeight: 700, color: "primary.main", fontSize: 32, letterSpacing: "0.05em" }}>
          {heading}
        </Typography>
      </Stack>
      <Box sx={{ position: "absolute", top: 24, right: 32 }}>
        <ConnectionStatus />
      </Box>

      {/* Hidden RFID input */}
      <input
        ref={inputRef}
        type="text"
        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        autoFocus
      />

      <Stack spacing={4} sx={{ alignItems: "center", width: "100%", maxWidth: 720 }}>
        <Typography
          component={motion.h1}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{
            fontSize: { xs: 40, md: 56 },
            fontWeight: 600,
            letterSpacing: "-0.5px",
            textAlign: "center",
          }}
        >
          Scan Your{" "}
          <Box component="span" sx={{ color: "primary.main" }}>
            RFID Tag
          </Box>
        </Typography>

        {state === "idle" && (
          <Stack
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            spacing={2}
            sx={{ alignItems: "center" }}
          >
            <motion.img
              src={rfidReaderImg}
              alt="RFID Reader"
              style={{ height: 128, width: "auto" }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <Typography sx={{ fontSize: 18, color: "text.secondary" }}>
              Place your tag near the reader
            </Typography>
          </Stack>
        )}

        {state === "loading" && (
          <Stack
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            spacing={2}
            sx={{ alignItems: "center" }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: "4px solid",
                borderColor: "primary.main",
                borderTopColor: "transparent",
                animation: "spin 1s linear infinite",
                "@keyframes spin": { to: { transform: "rotate(360deg)" } },
              }}
            />
            <Typography sx={{ fontSize: 18, color: "text.secondary" }}>Processing...</Typography>
          </Stack>
        )}

        <AnimatePresence mode="wait">
          {state === "success" && (
            <Card
              key="success"
              component={motion.div}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              sx={{
                width: "100%",
                p: 4,
                // Saab: neutral container så de gula accenterna (namn/ikon/ram)
                // läses — primaryContainer är gult och gav gul-på-gul.
                bgcolor: isSaab
                  ? "var(--mui-palette-m3-surfaceContainerHigh)"
                  : "var(--mui-palette-m3-primaryContainer)",
                border: 1,
                borderColor: "primary.main",
                textAlign: "center",
              }}
            >
              {result?.success && result.lane && result.weapon ? (
                <Stack spacing={3} sx={{ alignItems: "center" }}>
                  <Typography sx={{ fontSize: { xs: 36, md: 48 }, fontWeight: 600 }}>
                    Welcome{" "}
                    <Box component="span" sx={{ color: "primary.main" }}>
                      {result.user?.name}
                    </Box>
                  </Typography>
                  <Typography sx={{ fontSize: 20, color: "text.secondary" }}>
                    Pick up your {section === "live_fire" ? "tablet" : "weapon"} and proceed to your lane
                  </Typography>
                  <Stack spacing={1.5} sx={{ width: "100%" }}>
                    <ResultRow label={section === "live_fire" ? "Tablet" : "Weapon"} value={result.weapon.weapon_name} />
                    <ResultRow label="Lane" value={String(result.lane)} />
                  </Stack>
                  <Button variant="contained" size="large" onClick={dismissSuccess} fullWidth sx={{ minHeight: 56, fontSize: 18, fontWeight: 600 }}>
                    Confirm
                  </Button>
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Closing in {countdown}s</Typography>
                </Stack>
              ) : (
                <Stack spacing={2} sx={{ alignItems: "center" }}>
                  <CheckCircle sx={{ fontSize: 64, color: "primary.main" }} />
                  <Typography sx={{ fontSize: 24, fontWeight: 600 }}>{message}</Typography>
                </Stack>
              )}
            </Card>
          )}

          {state === "error" && (
            <Card
              key="error"
              component={motion.div}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              sx={{
                width: "100%",
                p: 4,
                bgcolor: "var(--mui-palette-m3-errorContainer)",
                border: 1,
                borderColor: "error.main",
                textAlign: "center",
              }}
            >
              <Stack spacing={2} sx={{ alignItems: "center" }}>
                <WarningAmber sx={{ fontSize: 64, color: "error.main" }} />
                <Typography sx={{ fontSize: 24, fontWeight: 600 }}>{message}</Typography>
              </Stack>
            </Card>
          )}

          {state === "register" && (
            <Card
              key="register"
              component={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              sx={{
                width: "100%",
                p: 4,
                bgcolor: "var(--mui-palette-m3-surfaceContainerHigh)",
                border: 1,
                borderColor: "primary.main",
              }}
            >
              <Stack spacing={2} sx={{ alignItems: "center" }}>
                <WarningAmber sx={{ fontSize: 40, color: "primary.main" }} />
                <Typography sx={{ fontSize: 18, color: "primary.main", fontWeight: 600 }}>{message}</Typography>
                <RegistrationForm
                  rfid={pendingRfid}
                  onRegister={handleRegister}
                  onLink={handleLink}
                  onCancel={handleCancelRegistration}
                  isLoading={isLoading}
                />
              </Stack>
            </Card>
          )}
        </AnimatePresence>
      </Stack>

      <RFIDSimulator onSimulate={handleScan} />
    </Box>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 2,
        border: 1,
        borderColor: "primary.main",
        bgcolor: "var(--mui-palette-m3-surfaceContainerLow)",
        px: 3,
        py: 2,
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 500, color: "text.secondary", letterSpacing: "0.2em", textTransform: "uppercase" }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 28, fontWeight: 700, fontFamily: '"Roboto Mono", monospace', color: "primary.main" }}>
        {value}
      </Typography>
    </Stack>
  );
}
