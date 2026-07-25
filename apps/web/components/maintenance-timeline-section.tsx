"use client";

import { useState } from "react";
import { MaintenanceScheduleConsole } from "@/components/maintenance-schedule-console";
import { MaintenanceTimelineConsole } from "@/components/maintenance-timeline-console";
import { OwnershipRecordsConsole } from "@/components/ownership-records-console";
import { Button } from "@/components/ui/button";
import type { OwnershipRecordEntry, ScheduleProjectionRow, ServiceHistoryTab, TimelineEntry } from "@/lib/console-types";
import { cn } from "@/lib/utils";

type MaintenanceTimelineSectionProps = {
  timeline: TimelineEntry[];
  ownershipRecords: OwnershipRecordEntry[];
  scheduleNear: ScheduleProjectionRow[];
  scheduleExtended: ScheduleProjectionRow[];
  scheduleFull: ScheduleProjectionRow[];
  effectiveMilesPerYear: number;
  hasKnowledgeSchedule?: boolean;
  activeTab?: ServiceHistoryTab;
  onTabChange?: (tab: ServiceHistoryTab) => void;
  disabled?: boolean;
  onOpenEvidence?: (documentId: string) => void;
  onUpdateService?: (serviceId: string, patch: Partial<TimelineEntry>) => Promise<void>;
  requireEditConfirmation?: boolean;
  onGoToImport?: () => void;
  historyOnly?: boolean;
  ownerSimple?: boolean;
};

const TAB_ITEMS = [
  { id: "history" as const, label: "History" },
  { id: "schedule" as const, label: "Schedule" },
  { id: "ownership" as const, label: "Ownership" },
] as const;

export function MaintenanceTimelineSection({
  timeline,
  ownershipRecords,
  scheduleNear,
  scheduleExtended,
  scheduleFull,
  effectiveMilesPerYear,
  hasKnowledgeSchedule = false,
  activeTab,
  onTabChange,
  disabled = false,
  onOpenEvidence,
  onUpdateService,
  requireEditConfirmation = false,
  onGoToImport,
  historyOnly = false,
  ownerSimple = false,
}: MaintenanceTimelineSectionProps) {
  const [internalTab, setInternalTab] = useState<ServiceHistoryTab>("history");
  const tab = activeTab ?? internalTab;

  const setTab = (next: ServiceHistoryTab) => {
    if (onTabChange) {
      onTabChange(next);
      return;
    }
    setInternalTab(next);
  };

  return (
    <div className="space-y-4">
      {historyOnly ? (
        <MaintenanceTimelineConsole
          entries={timeline}
          disabled={disabled}
          onOpenEvidence={onOpenEvidence}
          onUpdateService={onUpdateService}
          requireEditConfirmation={requireEditConfirmation}
          ownerSimple={ownerSimple}
        />
      ) : (
        <>
          <div
            className="grid w-full grid-cols-3 rounded-lg border border-border bg-muted/40 p-0.5 sm:inline-flex sm:w-auto"
            role="tablist"
            aria-label="Service history views"
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
                {item.id === "ownership" && ownershipRecords.length > 0 ? (
                  <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
                    {ownershipRecords.length}
                  </span>
                ) : null}
              </Button>
            ))}
          </div>

          {tab === "history" ? (
            <MaintenanceTimelineConsole
              entries={timeline}
              disabled={disabled}
              onOpenEvidence={onOpenEvidence}
              onUpdateService={onUpdateService}
              requireEditConfirmation={requireEditConfirmation}
              ownerSimple={ownerSimple}
            />
          ) : null}

          {tab === "schedule" ? (
            <MaintenanceScheduleConsole
              nearRows={scheduleNear}
              extendedRows={scheduleExtended}
              fullRows={scheduleFull}
              effectiveMilesPerYear={effectiveMilesPerYear}
              hasKnowledgeSchedule={hasKnowledgeSchedule}
            />
          ) : null}

          {tab === "ownership" ? (
            <OwnershipRecordsConsole
              entries={ownershipRecords}
              disabled={disabled}
              onGoToImport={onGoToImport}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
