"use client";

import { useEffect, useState } from "react";

/** The PWA keeps a local draft, but a confirmed record still needs a connection. */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const syncStatus = () => setIsOnline(window.navigator.onLine);
    syncStatus();
    window.addEventListener("online", syncStatus);
    window.addEventListener("offline", syncStatus);
    return () => {
      window.removeEventListener("online", syncStatus);
      window.removeEventListener("offline", syncStatus);
    };
  }, []);

  return isOnline;
}
