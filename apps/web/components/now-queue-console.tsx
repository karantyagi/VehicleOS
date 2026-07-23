"use client";

import { useMemo, useState } from "react";
import { ListChecks } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ConsoleDetailPanel, ConsoleDetailPlaceholder, ConsoleSplit } from "@/components/console-split";
import { DataGridToolbar } from "@/components/data-grid-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { QueueItem } from "@/lib/console-types";
import { downloadCsv, filterByQuery, sortRows } from "@/lib/data-grid-utils";
import { formatRuleLineage } from "@/lib/rule-lineage";
import { useConsoleListKeyboard } from "@/lib/use-console-list-keyboard";
import { useAppUiStore } from "@/lib/store/app-ui-store";
import { cn } from "@/lib/utils";

const classifyKind = (item: QueueItem) => item.taskKind ?? "recommendation";

type NowQueueConsoleProps = {
  items: QueueItem[];
  disabled?: boolean;
  onDecide: (taskId: string, decision: "approve" | "dismiss" | "snooze") => void;
};

export function NowQueueConsole({ items, disabled = false, onDecide }: NowQueueConsoleProps) {
  const selectedId = useAppUiStore((s) => s.selectedNowTaskId);
  const setSelectedId = useAppUiStore((s) => s.setSelectedNowTaskId);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("status-asc");

  const pending = useMemo(() => items.filter((item) => item.status === "pending"), [items]);

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
        title="Nothing needs a decision"
        description="Refresh recommendations after service or check Timeline for history."
      />
    );
  }

  const selected = visible.find((item) => item.taskId === selectedId) ?? pending.find((item) => item.taskId === selectedId) ?? null;
  const lineage = selected ? formatRuleLineage(selected.ruleId) : null;

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
            "vehicleos-now-queue.csv",
            ["taskId", "title", "status", "kind", "ruleId", "reason"],
            visible.map((row) => [
              row.taskId,
              row.title,
              row.status,
              classifyKind(row),
              row.ruleId ?? "",
              row.reason,
            ]),
          )
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Rule</TableHead>
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
              <TableCell className="max-w-[12rem] truncate font-medium">{item.title}</TableCell>
              <TableCell>
                <Badge variant={item.taskKind === "verification" ? "warning" : "default"}>
                  {classifyKind(item)}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[8rem] truncate font-mono text-xs text-muted-foreground">
                {item.ruleId ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-2 text-[11px] text-muted-foreground">
        <kbd className="rounded border border-border px-1 font-mono text-[10px]">j</kbd>{" "}
        <kbd className="rounded border border-border px-1 font-mono text-[10px]">k</kbd> move ·{" "}
        <kbd className="rounded border border-border px-1 font-mono text-[10px]">/</kbd> command
      </p>
    </>
  );

  const detail = selected && lineage ? (
    <ConsoleDetailPanel title={selected.title}>
      <p className="text-muted-foreground">{selected.reason}</p>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Lineage</p>
        <Badge variant="secondary">{lineage.label}</Badge>
        <p className="font-mono text-xs text-muted-foreground break-all">{lineage.detail}</p>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" size="sm" disabled={disabled} onClick={() => onDecide(selected.taskId, "approve")}>
          {selected.taskKind === "verification" ? "Mark resolved" : "Approve"}
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={() => onDecide(selected.taskId, "dismiss")}>
          Dismiss
        </Button>
        {selected.taskKind !== "verification" ? (
          <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onDecide(selected.taskId, "snooze")}>
            Snooze
          </Button>
        ) : null}
      </div>
    </ConsoleDetailPanel>
  ) : (
    <ConsoleDetailPlaceholder />
  );

  return <ConsoleSplit list={list} detail={detail} hasSelection={Boolean(selected)} emptyDetail={detail} />;
}
