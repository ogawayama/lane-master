import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wifi, WifiOff } from "lucide-react";

export function ConnectionStatus() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel("connection-check")
      .on("presence", { event: "sync" }, () => {
        setConnected(true);
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {connected ? (
        <>
          <Wifi className="h-3.5 w-3.5 text-accent" />
          <span className="text-accent">LIVE</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5 text-destructive" />
          <span className="text-destructive">OFFLINE</span>
        </>
      )}
    </div>
  );
}
