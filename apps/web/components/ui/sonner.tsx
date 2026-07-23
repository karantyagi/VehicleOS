"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 1023px)";

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

export function Toaster() {
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobileViewport();

  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position={isMobile ? "bottom-center" : "top-right"}
      offset={16}
      mobileOffset={isMobile ? { bottom: 20 } : undefined}
      visibleToasts={4}
      toastOptions={{
        classNames: {
          toast:
            "group toast border-border bg-card text-foreground shadow-lg rounded-lg font-sans",
          title: "text-sm font-medium",
          description: "text-sm text-muted-foreground",
          success: "border-primary/20",
          error: "border-destructive/30",
        },
      }}
      closeButton
      richColors
    />
  );
}
