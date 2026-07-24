"use client";

import { useEffect } from "react";
import { resolveInitialConsoleMode } from "@/lib/console-mode";
import { useAppUiStore } from "@/lib/store/app-ui-store";

/** Hydrate console mode from localStorage once on the client. */
export function ConsoleModeHydrator() {
  const hydrateConsoleMode = useAppUiStore((state) => state.hydrateConsoleMode);

  useEffect(() => {
    hydrateConsoleMode(resolveInitialConsoleMode());
  }, [hydrateConsoleMode]);

  return null;
}
