"use client";

import { useState, type KeyboardEvent } from "react";
import { CalendarDays, History as HistoryIcon } from "lucide-react";
import { MaintenanceScheduleConsole } from "@/components/maintenance-schedule-console";
import { MaintenanceTimelineConsole } from "@/components/maintenance-timeline-console";
import { OwnershipRecordsConsole } from "@/components/ownership-records-console";
import { Button } from "@/components/ui/button";
import type {
  OwnerDueItemsView,
  OwnerHistoryItem,
  OwnershipRecordEntry,
  QueueItem,
  ScheduleProjectionRow,
  ServiceHistoryTab,
  TimelineEntry,
} from "@/lib/console-types";
import { cn } from "@/lib/utils";
import type { OwnerContextMemory } from "@vehicleos/domain";

type MaintenanceTimelineSectionProps = {
  timeline: TimelineEntry[];
  ownershipRecords: OwnershipRecordEntry[];
  ownerDueItems?: OwnerDueItemsView | null;
  ownerHistoryTimeline?: OwnerHistoryItem[];
  verifications?: QueueItem[];
  scheduleNear: ScheduleProjectionRow[];
  scheduleExtended: ScheduleProjectionRow[];
  scheduleFull: ScheduleProjectionRow[];
  effectiveMilesPerYear: number;
  hasKnowledgeSchedule?: boolean;
  activeTab?: ServiceHistoryTab;
  focusedScheduleEntryId?: string | null;
  addRequestKey?: number;
  addRequestTaskId?: string | null;
  addRequestLineItem?: string | null;
  onAddRequestHandled?: () => void;
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
  onReviewVerification?: (taskId: string) => void;
  onAddService?: (draft: import("@/components/maintenance-record-fields").MaintenanceRecordDraft) => Promise<void>;
  onUpdateCurrentMileage?: (mileage: number) => Promise<void>;
  requireEditConfirmation?: boolean;
  onGoToImport?: () => void;
  historyOnly?: boolean;
  ownerSimple?: boolean;
  maintenancePatterns?: Record<string, { timing: "early" | "late"; reason: string; confirmedAt: string }>;
  observedMilesPerYear?: number | null;
  statedMilesPerYear?: number | null;
  dueSoonDays?: number;
  ownerContextMemory?: OwnerContextMemory | null;
  onSaveOwnerContextMemory?: (
    memory: OwnerContextMemory,
    successMessage: string,
  ) => Promise<void>;
};

const TAB_ITEMS = [
  { id: "schedule" as const, label: "Schedule", icon: CalendarDays },
  { id: "history" as const, label: "History", icon: HistoryIcon },
] as const;

const tabTriggerId = (tab: ServiceHistoryTab) => `maintenance-${tab}-tab`;
const tabPanelId = (tab: ServiceHistoryTab) => `maintenance-${tab}-panel`;

export function MaintenanceTimelineSection({
  timeline,
  ownershipRecords,
  ownerDueItems = null,
  ownerHistoryTimeline,
  verifications = [],
  scheduleNear,
  scheduleExtended,
  scheduleFull,
  effectiveMilesPerYear,
  hasKnowledgeSchedule = false,
  activeTab,
  focusedScheduleEntryId,
  addRequestKey,
  addRequestTaskId,
  addRequestLineItem,
  onAddRequestHandled,
  onTabChange,
  disabled = false,
  defaultMileage = 0,
  onOpenEvidence,
  onUpdateService,
  onMergeService,
  onReviewVerification,
  onAddService,
  onUpdateCurrentMileage,
  requireEditConfirmation = false,
  onGoToImport,
  historyOnly = false,
  ownerSimple = false,
  maintenancePatterns,
  observedMilesPerYear,
  statedMilesPerYear,
  dueSoonDays,
  ownerContextMemory,
  onSaveOwnerContextMemory,
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

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % TAB_ITEMS.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + TAB_ITEMS.length) % TAB_ITEMS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = TAB_ITEMS.length - 1;

    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = TAB_ITEMS[nextIndex].id;
    setTab(nextTab);
    document.getElementById(tabTriggerId(nextTab))?.focus();
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
          verifications={verifications}
          onReviewVerification={onReviewVerification}
          onGoToImport={onGoToImport}
        />
      ) : (
        <>
          <div
            className="grid w-full max-w-lg grid-cols-2 gap-4 border-b border-border/80 px-1 sm:gap-6"
            role="tablist"
            aria-label="Maintenance views"
            aria-orientation="horizontal"
          >
            {TAB_ITEMS.map((item, index) => {
              const isActive = tab === item.id;
              const Icon = item.icon;

              return (
                <Button
                  key={item.id}
                  id={tabTriggerId(item.id)}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={tabPanelId(item.id)}
                  tabIndex={isActive ? 0 : -1}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-12 w-full rounded-none border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground transition-[color,border-color,background-color] duration-200 hover:bg-primary/[0.04] hover:text-foreground focus-visible:z-10 focus-visible:ring-offset-0 sm:h-11 sm:px-5",
                    isActive && "border-primary bg-primary/[0.06] text-primary hover:bg-primary/[0.08] hover:text-primary",
                  )}
                  onClick={() => setTab(item.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Button>
              );
            })}
          </div>

          <div
            id={tabPanelId("history")}
            role="tabpanel"
            aria-labelledby={tabTriggerId("history")}
            className="console-motion-fade space-y-6"
            hidden={tab !== "history"}
          >
            {tab === "history" ? (
              <>
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
                  verifications={verifications}
                  onReviewVerification={onReviewVerification}
                  onGoToImport={onGoToImport}
                  addRequestKey={addRequestKey}
                  addRequestTaskId={addRequestTaskId}
                  addRequestLineItem={addRequestLineItem}
                  onAddRequestHandled={onAddRequestHandled}
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
              </>
            ) : null}
          </div>

          <div
            id={tabPanelId("schedule")}
            role="tabpanel"
            aria-labelledby={tabTriggerId("schedule")}
            className="console-motion-fade"
            hidden={tab !== "schedule"}
          >
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
                disabled={disabled}
                serviceTimeline={timeline}
                focusedEntryId={focusedScheduleEntryId}
                ownerContextMemory={ownerContextMemory}
                onSaveOwnerContextMemory={onSaveOwnerContextMemory}
                onAddService={onAddService}
                onUpdateService={onUpdateService}
                onUpdateCurrentMileage={onUpdateCurrentMileage}
                attentionItems={verifications}
                onReviewAttentionTask={onReviewVerification}
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
