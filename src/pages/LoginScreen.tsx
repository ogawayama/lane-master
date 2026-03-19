import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import rfidReaderImg from "@/assets/rfid-reader.png";
import { Button } from "@/components/ui/button";
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
  type User } from
"@/services/assignmentService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger } from
"@/components/ui/alert-dialog";

type ScreenState = "idle" | "loading" | "success" | "error" | "register";

export default function LoginScreen() {
  const [state, setState] = useState<ScreenState>("idle");
  const [message, setMessage] = useState("");
  const [pendingRfid, setPendingRfid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input focused
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
        const result: AssignmentResult = await assignLaneAndWeapon(user);
        setState(result.success ? "success" : "error");
        setMessage(result.message);
        // Auto-clear after 6s
        setTimeout(() => {
          setState("idle");
          setMessage("");
          focusInput();
        }, 6000);
      } else {
        // Unknown RFID — show registration
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

  const handleRegister = async (data: {user_id: string;first_name: string;last_name: string;}) => {
    setIsLoading(true);
    try {
      const user = await registerUser({ ...data, rfid: pendingRfid });
      if (!user) {
        setState("error");
        setMessage("Registration failed. User ID or RFID may already exist.");
        return;
      }
      const result = await assignLaneAndWeapon(user);
      setState(result.success ? "success" : "error");
      setMessage(result.message);
      setTimeout(() => {setState("idle");setMessage("");focusInput();}, 6000);
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
      const result = await assignLaneAndWeapon(updated);
      setState(result.success ? "success" : "error");
      setMessage(result.message);
      setTimeout(() => {setState("idle");setMessage("");focusInput();}, 6000);
    } catch (err) {
      setState("error");
      setMessage("Linking error. Please try again.");
      console.error(err);
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

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await resetAllAssignments();
      setState("idle");
      setMessage("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      focusInput();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = (e.target as HTMLInputElement).value;
      (e.target as HTMLInputElement).value = "";
      handleScan(val);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-8" onClick={() => state !== "register" && focusInput()}>
      {/* Header */}
      <div className="absolute top-6 left-8 flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <span className="font-bold tracking-wide text-inherit text-4xl font-sans">
          RANGE CONTROL
        </span>
      </div>
      <div className="absolute top-6 right-8 flex items-center gap-4">
        <ConnectionStatus />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
              <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Reset All Assignments</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear all lane assignments and mark all weapons as available. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground">
                Reset All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Hidden RFID input */}
      <input
        ref={inputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        autoFocus />
      

      {/* Main content */}
      <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-bold text-foreground tracking-tight text-center">
          
          Scan Your <span className="text-primary">RFID Tag</span>
        </motion.h1>

        {state === "idle" &&
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4">
          
            <div className="flex items-center justify-center">
              <motion.img
                src={rfidReaderImg}
                alt="RFID Reader"
                className="h-32 w-auto"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </div>
            <p className="text-lg text-muted-foreground">Place your tag near the reader</p>
          </motion.div>
        }

        {state === "loading" &&
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-lg text-muted-foreground">Processing...</p>
          </motion.div>
        }

        <AnimatePresence mode="wait">
          {state === "success" &&
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4 rounded-2xl border border-accent/40 bg-accent/5 p-8 w-full text-center">
            
              <CheckCircle2 className="h-16 w-16 text-accent" />
              <p className="text-2xl font-bold text-foreground">{message}</p>
            </motion.div>
          }

          {state === "error" &&
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-8 w-full text-center">
            
              <AlertTriangle className="h-16 w-16 text-destructive" />
              <p className="text-2xl font-bold text-foreground">{message}</p>
            </motion.div>
          }

          {state === "register" &&
          <motion.div
            key="register"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col items-center gap-4 rounded-2xl border border-primary/30 bg-card p-8 w-full">
            
              <AlertTriangle className="h-10 w-10 text-primary" />
              <p className="text-lg text-primary font-semibold">{message}</p>
              <RegistrationForm
              rfid={pendingRfid}
              onRegister={handleRegister}
              onLink={handleLink}
              onCancel={handleCancelRegistration}
              isLoading={isLoading} />
            
            </motion.div>
          }
        </AnimatePresence>
      </div>

      <RFIDSimulator onSimulate={handleScan} />
    </div>);

}