"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { sanitizeSectionForMode } from "@/lib/console-mode";
import { useAppUiStore, type AppSection } from "@/lib/store/app-ui-store";

const VALID_SECTIONS = new Set<AppSection>([
  "reminders",
  "now",
  "timeline",
  "imports",
  "receipts",
  "evidence",
  "context",
  "notes",
  "quotes",
]);

export function PwaSectionLauncher() {
  const searchParams = useSearchParams();
  const setActiveSection = useAppUiStore((state) => state.setActiveSection);
  const consoleMode = useAppUiStore((state) => state.consoleMode);

  useEffect(() => {
    const section = searchParams.get("section");
    if (!section || !VALID_SECTIONS.has(section as AppSection)) return;
    setActiveSection(sanitizeSectionForMode(section as AppSection, consoleMode));
  }, [consoleMode, searchParams, setActiveSection]);

  return null;
}
