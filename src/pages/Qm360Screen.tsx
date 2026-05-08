import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import rfidReaderImg from "@/assets/rfid-reader.png";
import { RegistrationForm } from "@/components/RegistrationForm";
import { RFIDSimulator } from "@/components/RFIDSimulator";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import {
  lookupUserByRfid,
  registerUser,
  relinkRfid,
  type User,
} from "@/services/assignmentService";
import { getOrCreateGearAssignment } from "@/services/qm360Service";

type ScreenState = "idle" | "loading" | "success" | "error" | "register";

const HEADING = "GC IDT";
const THEME_HSL = "28 95% 58%";

export default function Qm360Screen() {
  const [state, setState] = useState<ScreenState>("idle");
  const [message, setMessage] = useState("");
  const [pendingRfid, setPendingRfid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (state === "register") return;
    focusInput();
    const interval = setInterval(focusInput, 2000);
    return () => clearInterval(interval);
  }, [focusInput, state]);

  const finalize = (success: boolean, msg: string) => {
    setState(success ? "success" : "error");
    setMessage(msg);
    setTimeout(() => {
      setState("idle");
      setMessage("");
      focusInput();
    }, 6000);
  };

  const handleScan = async (rfid: string) => {
    if (!rfid.trim() || isLoading) return;
    setState("loading");
    setIsLoading(true);
    setMessage("");
    try {
      const user = await lookupUserByRfid(rfid.trim());
      if (user) {
        const result = await getOrCreateGearAssignment(user);
        finalize(result.success, result.message);
      } else {
        setPendingRfid(rfid.trim());
        setState("register");
        setMessage("RFID not registered. Register RFID tag.");
      }
    } catch (err) {
      console.error(err);
      finalize(false, "System error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: { user_id: string; first_name: string; last_name: string }) => {
    setIsLoading(true);
    try {
      const user = await registerUser({ ...data, rfid: pendingRfid });
      if (!user) return finalize(false, "Registration failed. User ID or RFID may already exist.");
      const result = await getOrCreateGearAssignment(user);
      finalize(result.success, result.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLink = async (user: User) => {
    setIsLoading(true);
    try {
      const updated = await relinkRfid(user.id, pendingRfid);
      if (!updated) return finalize(false, "Failed to link RFID.");
      const result = await getOrCreateGearAssignment(updated);
      finalize(result.success, result.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRegistration = () => {
    setState("idle");
    setMessage("");
    setPendingRfid("");
    focusInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = (e.target as HTMLInputElement).value;
      (e.target as HTMLInputElement).value = "";
      handleScan(val);
    }
  };

  const themeStyle = { ["--primary" as string]: THEME_HSL, ["--ring" as string]: THEME_HSL } as React.CSSProperties;

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center p-8"
      style={themeStyle}
      onClick={() => state !== "register" && focusInput()}
    >
      <div className="absolute top-6 left-8 flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <span className="font-bold tracking-wide text-primary text-4xl font-sans">{HEADING}</span>
      </div>
      <div className="absolute top-6 right-8 flex items-center gap-4">
        <ConnectionStatus />
      </div>

      <input
        ref={inputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        autoFocus
      />

      <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-bold text-foreground tracking-tight text-center"
        >
          Scan Your <span className="text-primary">RFID Tag</span>
        </motion.h1>

        {state === "idle" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
            <motion.img
              src={rfidReaderImg}
              alt="RFID Reader"
              className="h-32 w-auto"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <p className="text-lg text-muted-foreground">Place your tag near the reader</p>
          </motion.div>
        )}

        {state === "loading" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-lg text-muted-foreground">Processing...</p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4 rounded-2xl border border-accent/40 bg-accent/5 p-8 w-full text-center"
            >
              <CheckCircle2 className="h-16 w-16 text-accent" />
              <p className="text-2xl font-bold text-foreground">{message}</p>
            </motion.div>
          )}

          {state === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-8 w-full text-center"
            >
              <AlertTriangle className="h-16 w-16 text-destructive" />
              <p className="text-2xl font-bold text-foreground">{message}</p>
            </motion.div>
          )}

          {state === "register" && (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col items-center gap-4 rounded-2xl border border-primary/30 bg-card p-8 w-full"
            >
              <AlertTriangle className="h-10 w-10 text-primary" />
              <p className="text-lg text-primary font-semibold">{message}</p>
              <RegistrationForm
                rfid={pendingRfid}
                onRegister={handleRegister}
                onLink={handleLink}
                onCancel={handleCancelRegistration}
                isLoading={isLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RFIDSimulator onSimulate={handleScan} />
    </div>
  );
}
