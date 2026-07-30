import { create } from "zustand";
import type { ConsoleMode } from "@/lib/console-mode";
import { persistConsoleMode, sanitizeSectionForMode } from "@/lib/console-mode";
import type { ConsoleDensity } from "@/lib/console-types";

export type AppSection =
  | "reminders"
  | "now"
  | "timeline"
  | "imports"
  | "receipts"
  | "evidence"
  | "context"
  | "notes"
  | "quotes";

/** Assistant-office labels — stable section ids for routing and store. */
export const APP_SECTIONS: { id: AppSection; label: string; description: string }[] = [
  {
    id: "reminders",
    label: "Home",
    description: "What needs attention this week, next week, and this month",
  },
  {
    id: "now",
    label: "Owner verification",
    description: "Rare conflicts the assistant can't resolve alone",
  },
  {
    id: "timeline",
    label: "Maintenance",
    description: "OEM schedule projection, past maintenance, and ownership records",
  },
  {
    id: "imports",
    label: "Add records",
    description: "Import CARFAX or RMV history; capture receipts and voice notes on mobile",
  },
  {
    id: "receipts",
    label: "Upload receipt",
    description: "Developer testing — golden-path confirm with manual fields (owners capture on mobile)",
  },
  {
    id: "evidence",
    label: "Evidence vault",
    description: "Stored artifacts for trust and resale",
  },
  {
    id: "context",
    label: "Manual & OEM",
    description: "Owner manual and maintenance intervals",
  },
  {
    id: "notes",
    label: "Owner notes intake",
    description: "Voice and structured owner entries",
  },
  {
    id: "quotes",
    label: "Quote review",
    description: "Dealer quotes and seasonal checks",
  },
];

export const ASSISTANT_WORKSPACE_GROUP_LABEL = "Assistant workspace";

export const SECTION_SHORTCUTS: Record<AppSection, string> = {
  reminders: "1",
  timeline: "2",
  imports: "3",
  now: "4",
  receipts: "5",
  evidence: "6",
  context: "7",
  notes: "8",
  quotes: "9",
};

type AppUiState = {
  consoleMode: ConsoleMode;
  activeSection: AppSection;
  mobileNavOpen: boolean;
  commandOpen: boolean;
  density: ConsoleDensity;
  selectedTimelineId: string | null;
  selectedEvidenceId: string | null;
  selectedNowTaskId: string | null;
  selectedOwnershipRecordId: string | null;
  setupFlowActive: boolean;
  setConsoleMode: (mode: ConsoleMode) => void;
  hydrateConsoleMode: (mode: ConsoleMode) => void;
  setActiveSection: (section: AppSection) => void;
  setMobileNavOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setDensity: (density: ConsoleDensity) => void;
  toggleDensity: () => void;
  setSelectedTimelineId: (id: string | null) => void;
  setSelectedEvidenceId: (id: string | null) => void;
  setSelectedNowTaskId: (id: string | null) => void;
  setSelectedOwnershipRecordId: (id: string | null) => void;
  clearVehicleSelections: () => void;
  setSetupFlowActive: (active: boolean) => void;
};

const clearSelections = {
  selectedTimelineId: null as string | null,
  selectedEvidenceId: null as string | null,
  selectedNowTaskId: null as string | null,
  selectedOwnershipRecordId: null as string | null,
};

export const useAppUiStore = create<AppUiState>((set, get) => ({
  consoleMode: "owner",
  activeSection: "reminders",
  mobileNavOpen: false,
  commandOpen: false,
  density: "comfortable",
  selectedTimelineId: null,
  selectedEvidenceId: null,
  selectedNowTaskId: null,
  selectedOwnershipRecordId: null,
  setupFlowActive: false,
  setConsoleMode: (consoleMode) => {
    persistConsoleMode(consoleMode);
    set({
      consoleMode,
      activeSection: sanitizeSectionForMode(get().activeSection, consoleMode),
      mobileNavOpen: false,
      ...clearSelections,
    });
  },
  hydrateConsoleMode: (consoleMode) => {
    set({
      consoleMode,
      activeSection: sanitizeSectionForMode(get().activeSection, consoleMode),
    });
  },
  setActiveSection: (activeSection) => {
    const { consoleMode } = get();
    set({
      activeSection: sanitizeSectionForMode(activeSection, consoleMode),
      mobileNavOpen: false,
      ...clearSelections,
    });
  },
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setDensity: (density) => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.density = density;
    }
    set({ density });
  },
  toggleDensity: () => {
    const next = get().density === "comfortable" ? "compact" : "comfortable";
    get().setDensity(next);
  },
  setSelectedTimelineId: (selectedTimelineId) =>
    set({
      selectedTimelineId,
      selectedEvidenceId: null,
      selectedNowTaskId: null,
      selectedOwnershipRecordId: null,
    }),
  setSelectedEvidenceId: (selectedEvidenceId) =>
    set({
      selectedEvidenceId,
      selectedTimelineId: null,
      selectedNowTaskId: null,
      selectedOwnershipRecordId: null,
    }),
  setSelectedNowTaskId: (selectedNowTaskId) =>
    set({
      selectedNowTaskId,
      selectedTimelineId: null,
      selectedEvidenceId: null,
      selectedOwnershipRecordId: null,
    }),
  setSelectedOwnershipRecordId: (selectedOwnershipRecordId) =>
    set({
      selectedOwnershipRecordId,
      selectedTimelineId: null,
      selectedEvidenceId: null,
      selectedNowTaskId: null,
    }),
  clearVehicleSelections: () => set(clearSelections),
  setSetupFlowActive: (setupFlowActive) => set({ setupFlowActive, mobileNavOpen: false }),
}));
