import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface AdminAuthCardProps {
  loading: boolean;
  onVerifyPin: (pin: string) => Promise<void>;
}

export function AdminAuthCard({ loading, onVerifyPin }: AdminAuthCardProps) {
  const [pin, setPin] = useState("");

  return (
    <div className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Admin access
          </div>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-5xl font-bold leading-none text-foreground">Enter the 4-digit admin PIN.</h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              This unlocks the admin console for user management, weapon management, and USB-friendly import/export workflows.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Users", "Create, edit, relink RFID, or remove records."],
              ["Weapons", "Track availability and update the active inventory."],
              ["Imports", "Validate CSV or Excel files before anything changes."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-lg border border-border bg-card/70 p-4">
                <div className="text-sm font-semibold text-foreground">{title}</div>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="border-border bg-card/95 shadow-2xl shadow-black/20">
          <CardHeader>
            <CardTitle>Admin PIN</CardTitle>
            <CardDescription>Enter the 4-digit code to continue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void onVerifyPin(pin);
                }
              }}
              className="h-14 text-center text-3xl tracking-[0.6em]"
            />
            <Button className="w-full" onClick={() => void onVerifyPin(pin)} disabled={loading || pin.length !== 4}>
              {loading ? "Checking PIN..." : "Unlock admin"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
