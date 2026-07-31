"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sanitizeSectionForMode } from "@/lib/console-mode";
import { useGarage } from "@/lib/garage/garage-context";
import { notify } from "@/lib/notify";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const garage = useGarage();
  const handledAddVehicleIntent = useRef<string | null>(null);
  const setActiveSection = useAppUiStore((state) => state.setActiveSection);
  const consoleMode = useAppUiStore((state) => state.consoleMode);

  useEffect(() => {
    const section = searchParams.get("section");
    if (!section || !VALID_SECTIONS.has(section as AppSection)) return;
    setActiveSection(sanitizeSectionForMode(section as AppSection, consoleMode));
  }, [consoleMode, searchParams, setActiveSection]);

  useEffect(() => {
    if (searchParams.get("addVehicle") !== "1" || garage.isLoading) return;

    const intent = searchParams.toString();
    if (handledAddVehicleIntent.current === intent) return;
    handledAddVehicleIntent.current = intent;

    const result = garage.startAddVehicle();
    if (!result.ok) notify(result.reason, "error");

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("addVehicle");
    const nextQuery = nextSearchParams.toString();
    router.replace(nextQuery ? `/?${nextQuery}` : "/", { scroll: false });
  }, [garage.isLoading, garage.startAddVehicle, router, searchParams]);

  return null;
}
