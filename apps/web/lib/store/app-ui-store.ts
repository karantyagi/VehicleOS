import { create } from "zustand";

export type AppSection = "now" | "timeline" | "receipts" | "evidence" | "more";

export const APP_SECTIONS: { id: AppSection; label: string; description: string }[] = [
  { id: "now", label: "Now", description: "Decisions and recommendations" },
  { id: "timeline", label: "Timeline", description: "Service history" },
  { id: "receipts", label: "Receipts", description: "Capture and confirm" },
  { id: "evidence", label: "Evidence", description: "Vault and export" },
  { id: "more", label: "More", description: "Voice, OEM, seasonal" },
];

export const CONSOLE_SECTIONS: AppSection[] = ["timeline", "evidence"];

type AppUiState = {
  activeSection: AppSection;
  mobileNavOpen: boolean;
  commandOpen: boolean;
  selectedTimelineId: string | null;
  selectedEvidenceId: string | null;
  setActiveSection: (section: AppSection) => void;
  setMobileNavOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setSelectedTimelineId: (id: string | null) => void;
  setSelectedEvidenceId: (id: string | null) => void;
};

export const useAppUiStore = create<AppUiState>((set) => ({
  activeSection: "now",
  mobileNavOpen: false,
  commandOpen: false,
  selectedTimelineId: null,
  selectedEvidenceId: null,
  setActiveSection: (activeSection) =>
    set({
      activeSection,
      mobileNavOpen: false,
      selectedTimelineId: null,
      selectedEvidenceId: null,
    }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setSelectedTimelineId: (selectedTimelineId) => set({ selectedTimelineId, selectedEvidenceId: null }),
  setSelectedEvidenceId: (selectedEvidenceId) => set({ selectedEvidenceId, selectedTimelineId: null }),
}));
