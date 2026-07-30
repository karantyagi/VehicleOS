"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { DeviationPatternForm } from "@/components/deviation-pattern-form";
import { IntervalConfirmForm } from "@/components/interval-confirm-form";
import { OdometerInlineForm } from "@/components/odometer-inline-form";
import { ConsoleDetailPanel, ConsoleDetailPlaceholder, ConsoleSplit } from "@/components/console-split";
import { DataGridToolbar } from "@/components/data-grid-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { QueueItem } from "@/lib/console-types";
import { downloadCsv, filterByQuery, sortRows } from "@/lib/data-grid-utils";
import { useConsoleListKeyboard } from "@/lib/use-console-list-keyboard";
import { useAppUiStore } from "@/lib/store/app-ui-store";
import { cn } from "@/lib/utils";

type NowQueueConsoleProps = {
  items: QueueItem[];
  disabled?: boolean;
  vehicleId?: string;
  apiBase?: string;
  currentMileage?: number;
  onDecide: (taskId: string, decision: "approve" | "dismiss") => void;
  onOdometerSaved?: () => void;
  onVerificationResolved?: () => void;
  onReviewTarget?: (item: QueueItem) => void;
  onError?: (message: string) => void;
  ownerSimple?: boolean;
  focusTaskId?: string | null;
};

export function NowQueueConsole({
  items,
  disabled = false,
  vehicleId,
  apiBase,
  currentMileage,
  onDecide,
  onOdometerSaved,
  onVerificationResolved,
  onReviewTarget,
  onError,
  ownerSimple = false,
  focusTaskId = null,
}: NowQueueConsoleProps) {
  const selectedId = useAppUiStore((s) => s.selectedNowTaskId);
  const setSelectedId = useAppUiStore((s) => s.setSelectedNowTaskId);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("status-asc");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusTaskId) return;
    setExpandedTaskId(focusTaskId);
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`verification-${focusTaskId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusTaskId]);

  const pending = useMemo(
    () => items.filter((item) => item.taskKind === "verification" && item.status === "pending"),
    [items],
  );

  const visible = useMemo(() => {
    const filtered = filterByQuery(pending, query, (row) =>
      [row.title, row.reason, row.ruleId ?? "", row.status].join(" "),
    );
    if (sort === "title-asc") return sortRows(filtered, (a, b) => a.title.localeCompare(b.title), "asc");
    if (sort === "title-desc") return sortRows(filtered, (a, b) => a.title.localeCompare(b.title), "desc");
    return sortRows(filtered, (a, b) => a.status.localeCompare(b.status), "asc");
  }, [pending, query, sort]);

  const rowIds = useMemo(() => visible.map((item) => item.taskId), [visible]);
  useConsoleListKeyboard({ rowIds, selectedId, onSelect: setSelectedId, enabled: visible.length > 0 });

  if (pending.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="All clear"
        description={ownerSimple ? undefined : "When records disagree, the assistant will ask you here — usually rare."}
      />
    );
  }

  if (ownerSimple) {
    return (
      <ul className="space-y-3">
        {pending.map((item) => {
          const showOdometerForm =
            item.verificationCode === "VERIFY_ODOMETER" && vehicleId && apiBase && currentMileage !== undefined;
          const showDeviationForm =
            item.verificationCode === "VERIFY_MAINTENANCE_TIMING" && vehicleId && apiBase;
          const showIntervalForm =
            item.verificationCode === "VERIFY_OWNER_INTERVAL" && vehicleId && apiBase;
          const isExpanded = expandedTaskId === item.taskId;

          return (
            <li
              id={`verification-${item.taskId}`}
              key={item.taskId}
              className={cn(
                "overflow-hidden rounded-xl border bg-card shadow-sm",
                item.severity === "blocking" ? "border-amber-300/80 dark:border-amber-800/70" : "border-border",
                focusTaskId === item.taskId && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
              )}
            >
              <button
                type="button"
                className="flex w-full items-start gap-3 p-4 text-left"
                aria-expanded={isExpanded}
                onClick={() => setExpandedTaskId(isExpanded ? null : item.taskId)}
              >
                <span className="min-w-0 flex-1 space-y-1.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold leading-tight">{item.title}</span>
                    {item.severity === "blocking" ? (
                      <Badge variant="warning">Needs confirmation</Badge>
                    ) : null}
                  </span>
                  {item.target?.label ? (
                    <span className="block text-xs text-muted-foreground">{item.target.label}</span>
                  ) : null}
                </span>
                <span className="shrink-0 pt-0.5 text-muted-foreground">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  )}
                </span>
              </button>
              {isExpanded ? (
                <div className="space-y-3 border-t border-border/60 px-4 pb-4 pt-3">
                  <p className="text-sm text-muted-foreground">{item.reason}</p>
                  {showIntervalForm ? (
                    <IntervalConfirmForm
                      vehicleId={vehicleId}
                      taskId={item.taskId}
                      apiBase={apiBase}
                      disabled={disabled}
                      suggestedIntervalMiles={item.suggestedIntervalMiles ?? null}
                      suggestedIntervalMonths={item.suggestedIntervalMonths ?? null}
                      intervalKind={item.intervalKind}
                      dismissLabel={
                        item.ruleId?.includes("owner-habit:") ? "Not now" : "Keep OEM interval"
                      }
                      onConfirmed={() => onVerificationResolved?.()}
                      onDismiss={() => onDecide(item.taskId, "dismiss")}
                      onError={(message) => onError?.(message)}
                    />
                  ) : null}
                  {showDeviationForm ? (
                    <DeviationPatternForm
                      vehicleId={vehicleId}
                      taskId={item.taskId}
                      apiBase={apiBase}
                      disabled={disabled}
                      suggestedReasonId={item.suggestedReasonId ?? null}
                      draftReasonSource={item.draftReasonSource ?? null}
                      onConfirmed={() => onVerificationResolved?.()}
                      onError={(message) => onError?.(message)}
                    />
                  ) : null}
                  {showOdometerForm ? (
                    <OdometerInlineForm
                      vehicleId={vehicleId}
                      apiBase={apiBase}
                      defaultMileage={currentMileage}
                      disabled={disabled}
                      onSaved={() => {
                        onOdometerSaved?.();
                        onDecide(item.taskId, "approve");
                      }}
                      onError={(message) => onError?.(message)}
                    />
                  ) : null}
                  {!showDeviationForm && !showIntervalForm ? (
                    <div className="flex flex-wrap gap-2">
                      {item.target && item.target.surface !== "home" && !showOdometerForm ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={disabled}
                          onClick={() => onReviewTarget?.(item)}
                        >
                          Review {item.target.label.toLowerCase()}
                        </Button>
                      ) : null}
                      <Button type="button" size="sm" disabled={disabled} onClick={() => onDecide(item.taskId, "approve")}>
                        Confirm
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={disabled}
                        onClick={() => onDecide(item.taskId, "dismiss")}
                      >
                        Keep existing
                      </Button>
                    </div>
                  ) : showDeviationForm ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={disabled}
                        onClick={() => onDecide(item.taskId, "dismiss")}
                      >
                        Keep existing
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  }

  const selected =
    visible.find((item) => item.taskId === selectedId) ??
    pending.find((item) => item.taskId === selectedId) ??
    null;

  const list = (
    <>
      <DataGridToolbar
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        sortOptions={[
          { id: "status-asc", label: "Status A→Z" },
          { id: "title-asc", label: "Title A→Z" },
          { id: "title-desc", label: "Title Z→A" },
        ]}
        resultCount={visible.length}
        totalCount={pending.length}
        onExport={() =>
          downloadCsv(
            "vehicleos-verification-queue.csv",
            ["taskId", "title", "status", "verificationCode", "reason"],
            visible.map((row) => [
              row.taskId,
              row.title,
              row.status,
              row.verificationCode ?? "",
              row.reason,
            ]),
          )
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Question</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((item) => (
            <TableRow
              key={item.taskId}
              className={cn("cursor-pointer", selectedId === item.taskId && "bg-primary/10")}
              onClick={() => setSelectedId(item.taskId)}
              tabIndex={0}
              role="button"
              aria-pressed={selectedId === item.taskId}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedId(item.taskId);
                }
              }}
            >
              <TableCell className="max-w-[14rem] truncate font-medium">{item.title}</TableCell>
              <TableCell>
                <Badge variant="warning">{item.verificationCode ?? "verify"}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );

  const showOdometerForm =
    selected?.verificationCode === "VERIFY_ODOMETER" && vehicleId && apiBase && currentMileage !== undefined;

  const detail = selected ? (
    <ConsoleDetailPanel title={selected.title}>
      <p className="text-muted-foreground">{selected.reason}</p>
      {showOdometerForm ? (
        <OdometerInlineForm
          vehicleId={vehicleId}
          apiBase={apiBase}
          defaultMileage={currentMileage}
          disabled={disabled}
          onSaved={() => {
            onOdometerSaved?.();
            onDecide(selected.taskId, "approve");
          }}
          onError={(message) => onError?.(message)}
        />
      ) : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" size="sm" disabled={disabled} onClick={() => onDecide(selected.taskId, "approve")}>
          Mark resolved
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={() => onDecide(selected.taskId, "dismiss")}>
          Dismiss
        </Button>
      </div>
    </ConsoleDetailPanel>
  ) : (
    <ConsoleDetailPlaceholder />
  );

  return <ConsoleSplit list={list} detail={detail} hasSelection={Boolean(selected)} emptyDetail={detail} />;
}
