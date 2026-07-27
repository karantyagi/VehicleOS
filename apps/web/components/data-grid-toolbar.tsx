"use client";

import { ArrowDownAZ, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortOption = {
  id: string;
  label: string;
};

type DataGridToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  sortOptions: SortOption[];
  onExport?: () => void;
  exportLabel?: string;
  resultCount: number;
  totalCount: number;
};

export function DataGridToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  sortOptions,
  onExport,
  exportLabel = "Export CSV",
  resultCount,
  totalCount,
}: DataGridToolbarProps) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Filter…"
          className="h-9 pl-8"
          aria-label="Filter rows"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowDownAZ className="h-3.5 w-3.5" aria-hidden />
          <Select value={sort} onValueChange={onSortChange}>
            <SelectTrigger className="h-9 w-[10rem] bg-background" aria-label="Sort rows">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        {onExport ? (
          <Button type="button" variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {exportLabel}
          </Button>
        ) : null}
        <span className="text-xs tabular-nums text-muted-foreground">
          {resultCount === totalCount ? `${totalCount} rows` : `${resultCount} / ${totalCount}`}
        </span>
      </div>
    </div>
  );
}
