import { useState } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminAuthCardProps {
  loading: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onGoogle: () => Promise<void>;
}

export function AdminAuthCard({ loading, onSignIn, onSignUp, onGoogle }: AdminAuthCardProps) {
  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [signUpData, setSignUpData] = useState({ email: "", password: "" });

  return (
    <div className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Admin access
          </div>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-5xl font-bold leading-none text-foreground">Control users, weapons, and USB-friendly bulk imports.</h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Sign in to manage the live range database, export files for USB transfer, and safely review imports before applying changes.
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
            <CardTitle>Admin sign-in</CardTitle>
            <CardDescription>Email/password is enabled, and Google sign-in is available for faster access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button type="button" variant="outline" className="w-full" onClick={() => void onGoogle()} disabled={loading}>
              <LogIn className="h-4 w-4" />
              Continue with Google
            </Button>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create admin</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="space-y-3 pt-3">
                <Input
                  type="email"
                  placeholder="admin@company.com"
                  value={signInData.email}
                  onChange={(event) => setSignInData((current) => ({ ...current, email: event.target.value }))}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={signInData.password}
                  onChange={(event) => setSignInData((current) => ({ ...current, password: event.target.value }))}
                />
                <Button className="w-full" onClick={() => void onSignIn(signInData.email, signInData.password)} disabled={loading}>
                  Sign in
                </Button>
              </TabsContent>
              <TabsContent value="signup" className="space-y-3 pt-3">
                <Input
                  type="email"
                  placeholder="admin@company.com"
                  value={signUpData.email}
                  onChange={(event) => setSignUpData((current) => ({ ...current, email: event.target.value }))}
                />
                <Input
                  type="password"
                  placeholder="Create a password"
                  value={signUpData.password}
                  onChange={(event) => setSignUpData((current) => ({ ...current, password: event.target.value }))}
                />
                <Button className="w-full" onClick={() => void onSignUp(signUpData.email, signUpData.password)} disabled={loading}>
                  Create account
                </Button>
                <p className="text-xs text-muted-foreground">Email verification stays on, so new admins must verify before signing in.</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
