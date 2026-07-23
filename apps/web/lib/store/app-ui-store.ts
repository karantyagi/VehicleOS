import { create } from "zustand";
import type { ConsoleDensity } from "@/lib/console-types";

export type AppSection = "now" | "timeline" | "receipts" | "evidence" | "context" | "notes" | "quotes";

export const APP_SECTIONS: { id: AppSection; label: string; description: string }[] = [
  { id: "now", label: "Now", description: "Decisions waiting on you" },
  { id: "timeline", label: "Timeline", description: "Service history" },
  { id: "receipts", label: "Receipts", description: "Photo or PDF capture" },
  { id: "evidence", label: "Evidence", description: "Stored artifacts" },
  { id: "context", label: "Add context", description: "Manual and maintenance schedule" },
  { id: "notes", label: "Notes", description: "Voice and owner entries" },
  { id: "quotes", label: "Quotes", description: "Dealer quotes and seasonal" },
];

export const CONSOLE_SECTIONS: AppSection[] = ["now", "timeline", "evidence"];

export const SECTION_SHORTCUTS: Record<AppSection, string> = {
  now: "1",
  timeline: "2",
  receipts: "3",
  evidence: "4",
  context: "5",
  notes: "6",
  quotes: "7",
};

type AppUiState = {
  activeSection: AppSection;
  mobileNavOpen: boolean;
  commandOpen: boolean;
  density: ConsoleDensity;
  selectedTimelineId: string | null;
  selectedEvidenceId: string | null;
  selectedNowTaskId: string | null;
  setActiveSection: (section: AppSection) => void;
  setMobileNavOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setDensity: (density: ConsoleDensity) => void;
  toggleDensity: () => void;
  setSelectedTimelineId: (id: string | null) => void;
  setSelectedEvidenceId: (id: string | null) => void;
  setSelectedNowTaskId: (id: string | null) => void;
};

const clearSelections = {
  selectedTimelineId: null as string | null,
  selectedEvidenceId: null as string | null,
  selectedNowTaskId: null as string | null,
};

export const useAppUiStore = create<AppUiState>((set, get) => ({
  activeSection: "now",
  mobileNavOpen: false,
  commandOpen: false,
  density: "comfortable",
  selectedTimelineId: null,
  selectedEvidenceId: null,
  selectedNowTaskId: null,
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
    set({ selectedTimelineId, selectedEvidenceId: null, selectedNowTaskId: null }),
  setSelectedEvidenceId: (selectedEvidenceId) =>
    set({ selectedEvidenceId, selectedTimelineId: null, selectedNowTaskId: null }),
  setSelectedNowTaskId: (selectedNowTaskId) =>
    set({ selectedNowTaskId, selectedTimelineId: null, selectedEvidenceId: null }),
}));
