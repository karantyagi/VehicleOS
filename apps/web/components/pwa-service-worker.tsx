"use client";

import { useEffect } from "react";

/**
 * Registers the smallest possible PWA worker for installability. It deliberately
 * does not cache owner data or API responses: VehicleOS remains network-first
 * until offline behavior has a dedicated product and security design.
 */
export function PwaServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }, []);

  return null;
}
