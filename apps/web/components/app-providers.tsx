"use client";

import { useEffect } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { useAppUiStore } from "@/lib/store/app-ui-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const density = useAppUiStore((s) => s.density);

  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  return <ThemeProvider>{children}</ThemeProvider>;
}
