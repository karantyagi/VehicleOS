const DISMISS_KEY = "vehicleos:pwa-install-dismissed-until";

export type PwaPlatform = "ios" | "android" | "desktop" | "standalone";

export const isStandaloneDisplay = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
};

export const detectPwaPlatform = (): PwaPlatform => {
  if (typeof window === "undefined") return "desktop";
  if (isStandaloneDisplay()) return "standalone";

  const userAgent = window.navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
};

export const isPwaInstallDismissed = (): boolean => {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until)) return false;
  return Date.now() < until;
};

export const dismissPwaInstallPrompt = (days = 14): void => {
  if (typeof window === "undefined") return;
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  window.localStorage.setItem(DISMISS_KEY, String(until));
};

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export const isBeforeInstallPromptEvent = (event: Event): event is BeforeInstallPromptEvent =>
  "prompt" in event && typeof (event as BeforeInstallPromptEvent).prompt === "function";
