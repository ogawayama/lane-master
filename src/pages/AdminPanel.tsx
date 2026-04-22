import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ShieldAlert } from "lucide-react";
import { AdminAuthCard } from "@/components/admin/AdminAuthCard";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  bootstrapFirstAdmin,
  getSession,
  isAdminBootstrapAvailable,
  isCurrentUserAdmin,
  signInAdmin,
  signInWithGoogle,
  signOutAdmin,
  signUpAdmin,
} from "@/services/adminService";

export default function AdminPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bootstrapAvailable, setBootstrapAvailable] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    void getSession().then((nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      void isAdminBootstrapAvailable().then(setBootstrapAvailable).catch(() => setBootstrapAvailable(false));
      return;
    }

    setLoading(true);
    void Promise.all([isCurrentUserAdmin(session), isAdminBootstrapAvailable()])
      .then(([nextIsAdmin, nextBootstrap]) => {
        setIsAdmin(nextIsAdmin);
        setBootstrapAvailable(nextBootstrap);
      })
      .catch((error) => {
        toast({ title: "Admin check failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [session]);

  const runAction = async (action: () => Promise<void>, success?: string) => {
    setWorking(true);
    try {
      await action();
      if (success) toast({ title: success });
    } catch (error) {
      toast({ title: "Request failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <AdminAuthCard
        loading={working}
        onSignIn={(email, password) => runAction(async () => { await signInAdmin(email, password); }, "Signed in")}
        onSignUp={(email, password) =>
          runAction(async () => {
            const data = await signUpAdmin(email, password);
            if (!data.session) {
              toast({ title: "Check your email", description: "Verify the new admin email before signing in." });
            }
          })
        }
        onGoogle={() => runAction(async () => { await signInWithGoogle(); })}
      />
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <Card className="w-full max-w-lg border-border bg-card/90">
          <CardHeader>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary/60">
              <ShieldAlert className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{bootstrapAvailable ? "Claim the first admin seat" : "Admin access required"}</CardTitle>
            <CardDescription>
              {bootstrapAvailable
                ? "No admin exists yet. The first verified account can securely claim the admin role."
                : "This account is authenticated but does not have admin permissions."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {bootstrapAvailable && (
              <Button onClick={() => void runAction(async () => {
                const created = await bootstrapFirstAdmin();
                if (!created) throw new Error("An admin has already been created.");
                setIsAdmin(true);
                setBootstrapAvailable(false);
              }, "Admin access granted") } disabled={working}>
                Become admin
              </Button>
            )}
            <Button variant="outline" onClick={() => void runAction(signOutAdmin)} disabled={working}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AdminDashboard email={session.user.email ?? "admin"} onSignOut={signOutAdmin} />;
}
