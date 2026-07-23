"use client";

import { useState } from "react";
import { MaintenanceScheduleConsole } from "@/components/maintenance-schedule-console";
import { MaintenanceTimelineConsole } from "@/components/maintenance-timeline-console";
import { Button } from "@/components/ui/button";
import type { ScheduleProjectionRow, TimelineEntry } from "@/lib/console-types";
import { cn } from "@/lib/utils";

type TimelineTab = "history" | "schedule";

type MaintenanceTimelineSectionProps = {
  timeline: TimelineEntry[];
  scheduleNear: ScheduleProjectionRow[];
  scheduleExtended: ScheduleProjectionRow[];
  effectiveMilesPerYear: number;
  disabled?: boolean;
  onOpenEvidence?: (documentId: string) => void;
};

export function MaintenanceTimelineSection({
  timeline,
  scheduleNear,
  scheduleExtended,
  effectiveMilesPerYear,
  disabled = false,
  onOpenEvidence,
}: MaintenanceTimelineSectionProps) {
  const [tab, setTab] = useState<TimelineTab>("history");

  return (
    <div className="space-y-4">
      <div
        className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
        role="tablist"
        aria-label="Timeline views"
      >
        {(
          [
            { id: "history" as const, label: "History" },
            { id: "schedule" as const, label: "Schedule" },
          ] as const
        ).map((item) => (
          <Button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 rounded-md px-3 text-sm",
              tab === item.id && "bg-background text-foreground shadow-sm",
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {tab === "history" ? (
        <MaintenanceTimelineConsole entries={timeline} disabled={disabled} onOpenEvidence={onOpenEvidence} />
      ) : (
        <MaintenanceScheduleConsole
          nearRows={scheduleNear}
          extendedRows={scheduleExtended}
          effectiveMilesPerYear={effectiveMilesPerYear}
        />
      )}
    </div>
  );
}
