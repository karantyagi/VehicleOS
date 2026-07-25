import type { AppSection } from "@/lib/store/app-ui-store";

export type ConsoleMode = "owner" | "developer";

export const CONSOLE_MODE_STORAGE_KEY = "vehicleos:console-mode";

/** Owner peek — aligned with assistant-product-model.md console map. */
export const OWNER_MODE_SECTIONS: AppSection[] = ["reminders", "now", "timeline", "imports", "receipts"];

export const DEVELOPER_ONLY_SECTIONS: AppSection[] = ["evidence", "context", "notes", "quotes"];

export const isDeveloperOnlySection = (section: AppSection): boolean =>
  DEVELOPER_ONLY_SECTIONS.includes(section);

export const isSectionVisibleInMode = (section: AppSection, mode: ConsoleMode): boolean =>
  mode === "developer" || OWNER_MODE_SECTIONS.includes(section);

export const sanitizeSectionForMode = (section: AppSection, mode: ConsoleMode): AppSection =>
  isSectionVisibleInMode(section, mode) ? section : "reminders";

export const readStoredConsoleMode = (): ConsoleMode | null => {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(CONSOLE_MODE_STORAGE_KEY);
  if (stored === "owner" || stored === "developer") return stored;
  return null;
};

export const resolveInitialConsoleMode = (): ConsoleMode => {
  const stored = readStoredConsoleMode();
  if (stored) return stored;
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return "developer";
  }
  return "owner";
};

export const persistConsoleMode = (mode: ConsoleMode): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSOLE_MODE_STORAGE_KEY, mode);
};
