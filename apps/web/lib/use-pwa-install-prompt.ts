"use client";

import { useCallback, useEffect, useState } from "react";
import {
  detectPwaPlatform,
  dismissPwaInstallPrompt,
  isBeforeInstallPromptEvent,
  isPwaInstallDismissed,
  isStandaloneDisplay,
  type BeforeInstallPromptEvent,
  type PwaPlatform,
} from "./pwa-install";

type UsePwaInstallPromptResult = {
  platform: PwaPlatform;
  isVisible: boolean;
  canNativeInstall: boolean;
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
  dismiss: () => void;
};

export const usePwaInstallPrompt = (enabled: boolean): UsePwaInstallPromptResult => {
  const [platform, setPlatform] = useState<PwaPlatform>("desktop");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    setPlatform(detectPwaPlatform());
    setIsDismissed(isPwaInstallDismissed());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (!isBeforeInstallPromptEvent(event)) return;
      setDeferredPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const dismiss = useCallback(() => {
    dismissPwaInstallPrompt();
    setIsDismissed(true);
  }, []);

  const install = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "accepted") {
      dismissPwaInstallPrompt(365);
      setIsDismissed(true);
    }
    return choice.outcome;
  }, [deferredPrompt]);

  const isStandalone = platform === "standalone" || isStandaloneDisplay();
  const isMobile = platform === "ios" || platform === "android";
  const isVisible = enabled && !isStandalone && !isDismissed && isMobile;

  return {
    platform,
    isVisible,
    canNativeInstall: Boolean(deferredPrompt),
    install,
    dismiss,
  };
};
