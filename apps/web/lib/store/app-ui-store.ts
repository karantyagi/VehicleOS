import { create } from "zustand";
import type { ConsoleDensity } from "@/lib/console-types";

export type AppSection =
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
    id: "now",
    label: "Owner verification",
    description: "Rare conflicts the assistant can't resolve alone",
  },
  {
    id: "timeline",
    label: "Service history",
    description: "Past services from records and events",
  },
  {
    id: "imports",
    label: "Record import",
    description: "CARFAX, RMV, and other owner PDFs — extract and review",
  },
  {
    id: "receipts",
    label: "Receipt intake",
    description: "Photos and PDFs handed to the assistant",
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

export const CONSOLE_SECTIONS: AppSection[] = ["now", "timeline", "evidence"];

export const SECTION_SHORTCUTS: Record<AppSection, string> = {
  now: "1",
  timeline: "2",
  imports: "3",
  receipts: "4",
  evidence: "5",
  context: "6",
  notes: "7",
  quotes: "8",
};

type AppUiState = {
  activeSection: AppSection;
  mobileNavOpen: boolean;
  commandOpen: boolean;
  density: ConsoleDensity;
  selectedTimelineId: string | null;
  selectedEvidenceId: string | null;
  selectedNowTaskId: string | null;
  selectedOwnershipRecordId: string | null;
  setActiveSection: (section: AppSection) => void;
  setMobileNavOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setDensity: (density: ConsoleDensity) => void;
  toggleDensity: () => void;
  setSelectedTimelineId: (id: string | null) => void;
  setSelectedEvidenceId: (id: string | null) => void;
  setSelectedNowTaskId: (id: string | null) => void;
  setSelectedOwnershipRecordId: (id: string | null) => void;
};

const clearSelections = {
  selectedTimelineId: null as string | null,
  selectedEvidenceId: null as string | null,
  selectedNowTaskId: null as string | null,
  selectedOwnershipRecordId: null as string | null,
};

export const useAppUiStore = create<AppUiState>((set, get) => ({
  activeSection: "now",
  mobileNavOpen: false,
  commandOpen: false,
  density: "comfortable",
  selectedTimelineId: null,
  selectedEvidenceId: null,
  selectedNowTaskId: null,
  selectedOwnershipRecordId: null,
  setActiveSection: (activeSection) =>
    set({
      activeSection,
      mobileNavOpen: false,
      ...clearSelections,
    }),
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
}));
