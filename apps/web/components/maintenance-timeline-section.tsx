"use client";

import { useState } from "react";
import { MaintenanceScheduleConsole } from "@/components/maintenance-schedule-console";
import { MaintenanceTimelineConsole } from "@/components/maintenance-timeline-console";
import { OwnershipRecordsConsole } from "@/components/ownership-records-console";
import { Button } from "@/components/ui/button";
import type {
  OwnerDueItemsView,
  OwnerHistoryItem,
  OwnershipRecordEntry,
  ScheduleProjectionRow,
  ServiceHistoryTab,
  TimelineEntry,
} from "@/lib/console-types";
import { cn } from "@/lib/utils";

type MaintenanceTimelineSectionProps = {
  timeline: TimelineEntry[];
  ownershipRecords: OwnershipRecordEntry[];
  ownerDueItems?: OwnerDueItemsView | null;
  ownerHistoryTimeline?: OwnerHistoryItem[];
  scheduleNear: ScheduleProjectionRow[];
  scheduleExtended: ScheduleProjectionRow[];
  scheduleFull: ScheduleProjectionRow[];
  effectiveMilesPerYear: number;
  hasKnowledgeSchedule?: boolean;
  activeTab?: ServiceHistoryTab;
  onTabChange?: (tab: ServiceHistoryTab) => void;
  disabled?: boolean;
  defaultMileage?: number;
  onOpenEvidence?: (documentId: string) => void;
  onUpdateService?: (serviceId: string, patch: Partial<TimelineEntry>) => Promise<void>;
  onMergeService?: (
    targetServiceId: string,
    mergedServiceId: string,
    lineItems: string[],
  ) => Promise<void>;
  onAddService?: (draft: import("@/components/maintenance-record-fields").MaintenanceRecordDraft) => Promise<void>;
  requireEditConfirmation?: boolean;
  onGoToImport?: () => void;
  historyOnly?: boolean;
  ownerSimple?: boolean;
  maintenancePatterns?: Record<string, { timing: "early" | "late"; reason: string; confirmedAt: string }>;
  observedMilesPerYear?: number | null;
  statedMilesPerYear?: number | null;
  dueSoonDays?: number;
};

const TAB_ITEMS = [
  { id: "schedule" as const, label: "Schedule" },
  { id: "history" as const, label: "History" },
] as const;

export function MaintenanceTimelineSection({
  timeline,
  ownershipRecords,
  ownerDueItems = null,
  ownerHistoryTimeline,
  scheduleNear,
  scheduleExtended,
  scheduleFull,
  effectiveMilesPerYear,
  hasKnowledgeSchedule = false,
  activeTab,
  onTabChange,
  disabled = false,
  defaultMileage = 0,
  onOpenEvidence,
  onUpdateService,
  onMergeService,
  onAddService,
  requireEditConfirmation = false,
  onGoToImport,
  historyOnly = false,
  ownerSimple = false,
  maintenancePatterns,
  observedMilesPerYear,
  statedMilesPerYear,
  dueSoonDays,
}: MaintenanceTimelineSectionProps) {
  const [internalTab, setInternalTab] = useState<ServiceHistoryTab>("schedule");
  const tab = activeTab ?? internalTab;

  const setTab = (next: ServiceHistoryTab) => {
    if (onTabChange) {
      onTabChange(next);
      return;
    }
    setInternalTab(next);
  };

  const historyItems = ownerHistoryTimeline ?? null;

  return (
    <div className="space-y-4">
      {historyOnly ? (
        <MaintenanceTimelineConsole
          entries={timeline}
          disabled={disabled}
          defaultMileage={defaultMileage}
          onOpenEvidence={onOpenEvidence}
          onUpdateService={onUpdateService}
          onMergeService={onMergeService}
          onAddService={onAddService}
          requireEditConfirmation={requireEditConfirmation}
          ownerSimple={ownerSimple}
          ownerHistoryItems={historyItems ?? undefined}
          onGoToImport={onGoToImport}
        />
      ) : (
        <>
          <div
            className="grid w-full grid-cols-2 rounded-lg border border-border bg-muted/40 p-0.5 sm:inline-flex sm:w-auto"
            role="tablist"
            aria-label="Maintenance views"
          >
            {TAB_ITEMS.map((item) => (
              <Button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 rounded-md px-3 text-sm sm:h-8",
                  tab === item.id && "bg-background text-foreground shadow-sm",
                )}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {tab === "history" ? (
            <div className="space-y-6">
              <MaintenanceTimelineConsole
                entries={timeline}
                disabled={disabled}
                defaultMileage={defaultMileage}
                onOpenEvidence={onOpenEvidence}
                onUpdateService={onUpdateService}
                onMergeService={onMergeService}
                onAddService={onAddService}
                requireEditConfirmation={requireEditConfirmation}
                ownerSimple={ownerSimple}
                ownerHistoryItems={historyItems ?? undefined}
                onGoToImport={onGoToImport}
              />
              {!ownerSimple && ownershipRecords.length > 0 ? (
                <div className="space-y-3 border-t border-border/70 pt-6">
                  <p className="text-sm font-medium text-foreground">RMV / DMV ownership records</p>
                  <OwnershipRecordsConsole
                    entries={ownershipRecords}
                    disabled={disabled}
                    onGoToImport={onGoToImport}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "schedule" ? (
            <MaintenanceScheduleConsole
              nearRows={scheduleNear}
              extendedRows={scheduleExtended}
              fullRows={scheduleFull}
              effectiveMilesPerYear={effectiveMilesPerYear}
              hasKnowledgeSchedule={hasKnowledgeSchedule}
              ownerSimple={ownerSimple}
              maintenancePatterns={maintenancePatterns}
              observedMilesPerYear={observedMilesPerYear}
              statedMilesPerYear={statedMilesPerYear}
              dueSoonDays={dueSoonDays}
              ownerDueItems={ownerDueItems}
              currentMileage={defaultMileage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
