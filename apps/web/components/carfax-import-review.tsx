"use client";

import { ChevronDown, ChevronRight, FileJson } from "lucide-react";
import { useMemo, useState } from "react";
import { ExtractionStatusBanner } from "@/components/extraction-status-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ImportTrustTier, TierImportSummary } from "@vehicleos/domain";
import { isoDateToLocalDate } from "@/lib/date-input";
import { cn } from "@/lib/utils";
import type { VehicleOsImportService } from "@/lib/record-import-types";

export type CarfaxReviewRow = VehicleOsImportService & {
  id: string;
  included: boolean;
  tier: ImportTrustTier;
  tierReasons: string[];
  locationCandidates?: string[];
};

type CarfaxImportReviewProps = {
  vehicleLabel: string;
  summary: TierImportSummary;
  rows: CarfaxReviewRow[];
  disabled?: boolean;
  isImporting?: boolean;
  onRowChange: (id: string, patch: Partial<CarfaxReviewRow>) => void;
  onIncludeAllReady: () => void;
  onExcludeAll: () => void;
  onConfirm: () => void;
};

const formatServiceDate = (iso: string): string => {
  const date = isoDateToLocalDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatShopLine = (row: CarfaxReviewRow): string => {
  const location = row.shopLocation?.trim();
  return location ? `${row.shop} · ${location}` : row.shop;
};

const tierBadgeVariant = (tier: ImportTrustTier): "secondary" | "warning" | "destructive" => {
  if (tier === "verify") return "warning";
  if (tier === "block") return "destructive";
  return "secondary";
};

const tierLabel = (tier: ImportTrustTier): string => {
  if (tier === "auto") return "Ready";
  if (tier === "enriched") return "Cleaned";
  if (tier === "verify") return "Review";
  return "Blocked";
};

function ReviewCard({
  row,
  disabled,
  isImporting,
  defaultExpanded,
  onRowChange,
}: {
  row: CarfaxReviewRow;
  disabled: boolean;
  isImporting: boolean;
  defaultExpanded: boolean;
  onRowChange: (id: string, patch: Partial<CarfaxReviewRow>) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const previewItem = row.lineItems[0];
  const extraCount = row.lineItems.length - 1;

  return (
    <article
      className={cn(
        "rounded-lg border bg-card transition-colors",
        row.included ? "border-border/80" : "border-border/50 opacity-60",
        row.tier === "verify" && row.included && "border-amber-500/40",
        row.tier === "block" && "border-destructive/40",
      )}
    >
      <div className="flex items-start gap-3 p-3">
        <input
          type="checkbox"
          checked={row.included}
          disabled={disabled || isImporting || row.tier === "block"}
          aria-label={`Include service on ${row.serviceDate}`}
          className="mt-1 h-4 w-4 rounded border-border"
          onChange={(event) => onRowChange(row.id, { included: event.target.checked })}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium tabular-nums">{formatServiceDate(row.serviceDate)}</p>
            <span className="text-xs text-muted-foreground tabular-nums">
              {row.mileage.toLocaleString()} mi
            </span>
            <Badge variant={tierBadgeVariant(row.tier)} className="text-[10px] uppercase tracking-wide">
              {tierLabel(row.tier)}
            </Badge>
          </div>
          <p className="text-sm text-foreground">{formatShopLine(row)}</p>
          {!expanded ? (
            <p className="text-xs text-muted-foreground">
              {previewItem}
              {extraCount > 0 ? ` · +${extraCount} more` : ""}
            </p>
          ) : null}
          {row.tierReasons.length > 0 ? (
            <ul className="space-y-0.5 text-xs text-amber-800 dark:text-amber-300">
              {row.tierReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 shrink-0 p-0"
          disabled={disabled || isImporting}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse row" : "Expand row"}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {expanded ? (
        <div className="space-y-3 border-t border-border/60 px-3 pb-3 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">Date</span>
              <Input
                value={row.serviceDate}
                disabled={disabled || isImporting || !row.included}
                className="h-8 text-xs"
                onChange={(event) => onRowChange(row.id, { serviceDate: event.target.value })}
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">Mileage</span>
              <Input
                type="number"
                value={row.mileage}
                disabled={disabled || isImporting || !row.included}
                className="h-8 text-xs tabular-nums"
                onChange={(event) =>
                  onRowChange(row.id, { mileage: Number(event.target.value) || 0 })
                }
              />
            </label>
            <label className="space-y-1 text-xs sm:col-span-2">
              <span className="font-medium text-muted-foreground">Shop</span>
              <Input
                value={row.shop}
                disabled={disabled || isImporting || !row.included}
                className="h-8 text-xs"
                onChange={(event) => onRowChange(row.id, { shop: event.target.value })}
              />
            </label>
            <label className="space-y-1 text-xs sm:col-span-2">
              <span className="font-medium text-muted-foreground">Location</span>
              {row.locationCandidates && row.locationCandidates.length > 0 && !row.shopLocation?.trim() ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {row.locationCandidates.map((candidate) => (
                    <Button
                      key={candidate}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={disabled || isImporting || !row.included}
                      onClick={() => onRowChange(row.id, { shopLocation: candidate })}
                    >
                      {candidate}
                    </Button>
                  ))}
                </div>
              ) : null}
              <Input
                value={row.shopLocation ?? ""}
                disabled={disabled || isImporting || !row.included}
                className="h-8 text-xs"
                placeholder="City, ST"
                onChange={(event) =>
                  onRowChange(row.id, { shopLocation: event.target.value || undefined })
                }
              />
            </label>
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {row.lineItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

export function CarfaxImportReview({
  vehicleLabel,
  summary,
  rows,
  disabled = false,
  isImporting = false,
  onRowChange,
  onIncludeAllReady,
  onExcludeAll,
  onConfirm,
}: CarfaxImportReviewProps) {
  const selectedCount = rows.filter((row) => row.included).length;
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate)),
    [rows],
  );
  const verifyRows = sortedRows.filter((row) => row.tier === "verify");
  const readyRows = sortedRows.filter((row) => row.tier === "auto" || row.tier === "enriched");
  const blockRows = sortedRows.filter((row) => row.tier === "block");
  const needsLocationPick = verifyRows.some((row) => (row.locationCandidates?.length ?? 0) > 0);
  const needsManualLocation = verifyRows.some(
    (row) =>
      row.tierReasons.some((reason) => reason.includes("Shop location missing")) &&
      (row.locationCandidates?.length ?? 0) === 0,
  );

  return (
    <div className="space-y-4">
      {needsLocationPick ? (
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          Geocoding found more than one match for a shop — pick the correct city below.
        </p>
      ) : null}
      {needsManualLocation ? <ExtractionStatusBanner variant="upcoming-places-lookup" /> : null}
      {needsManualLocation ? (
        <ExtractionStatusBanner variant="upcoming-shop-disambiguation-llm" />
      ) : null}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-medium">Assistant reviewed your CARFAX history</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {vehicleLabel} · {summary.readyCount} visit{summary.readyCount === 1 ? "" : "s"} ready to
          import
          {summary.verifyCount > 0
            ? ` · ${summary.verifyCount} need${summary.verifyCount === 1 ? "s" : ""} a quick look`
            : ""}
          {summary.blockCount > 0 ? ` · ${summary.blockCount} blocked` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary">{summary.autoCount} ready</Badge>
          {summary.enrichedCount > 0 ? (
            <Badge variant="secondary">{summary.enrichedCount} cleaned</Badge>
          ) : null}
          {summary.verifyCount > 0 ? (
            <Badge variant="warning">{summary.verifyCount} review</Badge>
          ) : null}
          {summary.blockCount > 0 ? (
            <Badge variant="destructive">{summary.blockCount} blocked</Badge>
          ) : null}
        </div>
      </div>

      {verifyRows.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Needs your review</h3>
          <div className="space-y-2">
            {verifyRows.map((row) => (
              <ReviewCard
                key={row.id}
                row={row}
                disabled={disabled}
                isImporting={isImporting}
                defaultExpanded
                onRowChange={onRowChange}
              />
            ))}
          </div>
        </section>
      ) : null}

      {blockRows.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Blocked — fix source or exclude</h3>
          <div className="space-y-2">
            {blockRows.map((row) => (
              <ReviewCard
                key={row.id}
                row={row}
                disabled={disabled}
                isImporting={isImporting}
                defaultExpanded
                onRowChange={onRowChange}
              />
            ))}
          </div>
        </section>
      ) : null}

      {readyRows.length > 0 ? (
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Ready to import</h3>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={disabled || isImporting}
                onClick={onIncludeAllReady}
              >
                Include all ready
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={disabled || isImporting}
                onClick={onExcludeAll}
              >
                Exclude all
              </Button>
            </div>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {readyRows.map((row) => (
              <ReviewCard
                key={row.id}
                row={row}
                disabled={disabled}
                isImporting={isImporting}
                defaultExpanded={false}
                onRowChange={onRowChange}
              />
            ))}
          </div>
        </section>
      ) : null}

      <Button type="button" disabled={disabled || isImporting || selectedCount === 0} onClick={onConfirm}>
        <FileJson className="mr-2 h-4 w-4" aria-hidden />
        {isImporting
          ? "Importing…"
          : `Confirm import (${selectedCount} visit${selectedCount === 1 ? "" : "s"})`}
      </Button>
      {selectedCount === 0 && rows.length > 0 ? (
        <p className="text-xs text-destructive">Select at least one visit to import.</p>
      ) : null}
    </div>
  );
}
