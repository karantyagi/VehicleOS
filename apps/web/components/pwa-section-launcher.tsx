"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAppUiStore, type AppSection } from "@/lib/store/app-ui-store";

const VALID_SECTIONS = new Set<AppSection>([
  "now",
  "timeline",
  "receipts",
  "evidence",
  "context",
  "notes",
  "quotes",
]);

export function PwaSectionLauncher() {
  const searchParams = useSearchParams();
  const setActiveSection = useAppUiStore((state) => state.setActiveSection);

  useEffect(() => {
    const section = searchParams.get("section");
    if (!section || !VALID_SECTIONS.has(section as AppSection)) return;
    setActiveSection(section as AppSection);
  }, [searchParams, setActiveSection]);

  return null;
}
