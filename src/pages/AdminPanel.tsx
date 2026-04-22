import { useState } from "react";
import { AdminAuthCard } from "@/components/admin/AdminAuthCard";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { toast } from "@/hooks/use-toast";
import { verifyAdminPin } from "@/services/adminService";

export default function AdminPanel() {
  const [loading, setLoading] = useState(false);
  const [verifiedPin, setVerifiedPin] = useState<string | null>(null);

  const handleVerifyPin = async (pin: string) => {
    setLoading(true);
    try {
      await verifyAdminPin(pin);
      setVerifiedPin(pin);
      toast({ title: "Admin unlocked" });
    } catch (error) {
      toast({
        title: "PIN rejected",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!verifiedPin) {
    return <AdminAuthCard loading={loading} onVerifyPin={handleVerifyPin} />;
  }

  return <AdminDashboard pin={verifiedPin} onLock={() => setVerifiedPin(null)} />;
}
