import { useEffect } from "react";
import { backfillMirror, subscribeUserHubSync } from "@/services/userHubService";
import { userHub } from "@/integrations/userhub/client";

/**
 * Mounts once at the app root. Backfills the local users mirror from
 * User Hub and keeps it in sync via realtime.
 */
export function useUserHubSync() {
  useEffect(() => {
    void backfillMirror();
    const channel = subscribeUserHubSync();
    return () => {
      void userHub.removeChannel(channel);
    };
  }, []);
}
