"use client";

import { useMemo, useState } from "react";
import { ListChecks } from "lucide-react";
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
  onDecide: (taskId: string, decision: "approve" | "dismiss" | "snooze") => void;
  onOdometerSaved?: () => void;
  onVerificationResolved?: () => void;
  onError?: (message: string) => void;
  ownerSimple?: boolean;
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
  onError,
  ownerSimple = false,
}: NowQueueConsoleProps) {
  const selectedId = useAppUiStore((s) => s.selectedNowTaskId);
  const setSelectedId = useAppUiStore((s) => s.setSelectedNowTaskId);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("status-asc");

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

          return (
            <li key={item.taskId} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h3 className="font-semibold leading-tight">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.reason}</p>
                </div>
                {showIntervalForm ? (
                  <IntervalConfirmForm
                    vehicleId={vehicleId}
                    taskId={item.taskId}
                    apiBase={apiBase}
                    disabled={disabled}
                    suggestedIntervalMiles={item.suggestedIntervalMiles ?? null}
                    suggestedIntervalMonths={item.suggestedIntervalMonths ?? null}
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
                    Dismiss
                  </Button>
                </div>
                ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={disabled}
                    onClick={() => onDecide(item.taskId, "dismiss")}
                  >
                    Dismiss
                  </Button>
                </div>
                )}
              </div>
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
