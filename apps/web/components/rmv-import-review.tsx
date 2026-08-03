"use client";

import { ChevronRight, ChevronUp, FileJson } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RMV_EVENT_LABELS, type VehicleOsRmvRecord } from "@/lib/record-import-types";
import { isoDateToLocalDate } from "@/lib/date-input";
import { cn } from "@/lib/utils";

export type RmvReviewRow = VehicleOsRmvRecord & {
  id: string;
  included: boolean;
  alreadyOnFile?: boolean;
  ownerLicenseReview?: OwnerLicenseReview;
};

export type OwnerLicenseSummary = {
  agency: string;
  licenseClass: string | null;
  expirationDate: string;
};

export type OwnerLicenseReview = {
  status: "new" | "review" | "missing_expiration";
  current?: OwnerLicenseSummary;
  reason?: "renewal" | "different_credential";
};

type RmvImportReviewProps = {
  vehicleLabel: string;
  rows: RmvReviewRow[];
  disabled?: boolean;
  isImporting?: boolean;
  onRowChange: (id: string, patch: Partial<RmvReviewRow>) => void;
  onIncludeAllReady: () => void;
  onExcludeAll: () => void;
  onConfirm: () => void;
};

const formatRecordDate = (iso: string): string => {
  const date = isoDateToLocalDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const parseDetailsField = (raw: string): string[] =>
  raw
    .split(/[·;]/)
    .map((line) => line.trim())
    .filter(Boolean);

const ownerLicenseSummaryLabel = (license: OwnerLicenseSummary): string =>
  [license.agency, license.licenseClass ? `Class ${license.licenseClass}` : null, `Expires ${formatRecordDate(license.expirationDate)}`]
    .filter(Boolean)
    .join(" · ");

function RmvReviewCard({
  row,
  disabled,
  isImporting,
  defaultExpanded,
  onRowChange,
}: {
  row: RmvReviewRow;
  disabled: boolean;
  isImporting: boolean;
  defaultExpanded: boolean;
  onRowChange: (id: string, patch: Partial<RmvReviewRow>) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const previewDetail = row.details[0];
  const extraDetails = row.details.length - 1;
  const isOwnerLicense = row.eventType === "license";
  const ownerLicenseReview = row.ownerLicenseReview;
  const needsOwnerDecision = ownerLicenseReview?.status === "review";
  const canEdit = row.included || ownerLicenseReview?.status === "missing_expiration";

  return (
    <article
      className={cn(
        "rounded-lg border bg-card transition-all duration-150",
        row.alreadyOnFile
          ? "border-border/50 opacity-70"
          : row.included
            ? "border-border/80 history-interactive"
            : "border-border/50 opacity-60",
      )}
    >
      <div className="flex items-start gap-3 p-3">
        {needsOwnerDecision ? (
          <span className="mt-1 block h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <input
            type="checkbox"
            checked={row.included}
            disabled={disabled || isImporting || row.alreadyOnFile || ownerLicenseReview?.status === "missing_expiration"}
            aria-label={`Include ${RMV_EVENT_LABELS[row.eventType]} on ${row.recordDate}`}
            className="mt-1 h-4 w-4 rounded border-border"
            onChange={(event) => onRowChange(row.id, { included: event.target.checked })}
          />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium tabular-nums">{formatRecordDate(row.recordDate)}</p>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {RMV_EVENT_LABELS[row.eventType]}
            </Badge>
            {isOwnerLicense ? (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                For you
              </Badge>
            ) : null}
            {needsOwnerDecision ? (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                Review owner change
              </Badge>
            ) : null}
            {row.alreadyOnFile ? (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                On file
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                Ready
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground">{row.description}</p>
          <p className="text-xs text-muted-foreground">{row.agency}</p>
          {!expanded && previewDetail ? (
            <p className="text-xs text-muted-foreground">
              {previewDetail}
              {extraDetails > 0 ? ` · +${extraDetails} more` : ""}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 shrink-0 p-0 text-history-highlight hover:bg-history-highlight/10 hover:text-history-highlight"
          disabled={disabled || isImporting}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse row" : "Expand row"}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {isOwnerLicense ? (
        <div className="border-t border-border/60 px-3 pb-3 pt-2 text-xs leading-relaxed text-muted-foreground">
          {ownerLicenseReview?.status === "new" ? (
            <p>Saved once to your owner profile and visible across your garage. Vehicle OS does not store a license number.</p>
          ) : null}
          {ownerLicenseReview?.status === "missing_expiration" ? (
            <p className="text-destructive">Add an expiration date before this owner-level record can be imported.</p>
          ) : null}
          {needsOwnerDecision && ownerLicenseReview.current ? (
            <div className="space-y-3">
              <p>
                {ownerLicenseReview.reason === "different_credential"
                  ? "This may be a different credential. It will not change your owner profile unless you explicitly choose the imported update."
                  : "The imported expiration differs from the deadline already saved to your owner profile."}
              </p>
              <dl className="grid gap-1 rounded-md border border-border/60 bg-muted/20 p-2.5">
                <div>
                  <dt className="font-medium text-foreground">Currently saved</dt>
                  <dd>{ownerLicenseSummaryLabel(ownerLicenseReview.current)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Imported record</dt>
                  <dd>
                    {ownerLicenseSummaryLabel({
                      agency: row.agency,
                      licenseClass: row.details.find((detail) => detail.toLowerCase().startsWith("license class:"))?.slice("license class:".length).trim() || null,
                      expirationDate: row.details.find((detail) => detail.toLowerCase().startsWith("expiration date:"))?.slice("expiration date:".length).trim() || row.recordDate,
                    })}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={row.included ? "outline" : "secondary"}
                  disabled={disabled || isImporting}
                  onClick={() => onRowChange(row.id, { included: false })}
                >
                  Keep current
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={row.included ? "secondary" : "outline"}
                  disabled={disabled || isImporting}
                  onClick={() => onRowChange(row.id, { included: true })}
                >
                  Use imported update
                </Button>
              </div>
              <p>It applies across your garage. The earlier record remains in your private history.</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {expanded ? (
        <div className="space-y-3 border-t border-border/60 px-3 pb-3 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">Date</span>
              <Input
                value={row.recordDate}
                disabled={disabled || isImporting || !canEdit || row.alreadyOnFile}
                className="h-8 text-xs"
                onChange={(event) => onRowChange(row.id, { recordDate: event.target.value })}
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">Agency</span>
              <Input
                value={row.agency}
                disabled={disabled || isImporting || !canEdit || row.alreadyOnFile}
                className="h-8 text-xs"
                onChange={(event) => onRowChange(row.id, { agency: event.target.value })}
              />
            </label>
            <label className="space-y-1 text-xs sm:col-span-2">
              <span className="font-medium text-muted-foreground">Description</span>
              <Input
                value={row.description}
                disabled={disabled || isImporting || !canEdit || row.alreadyOnFile}
                className="h-8 text-xs"
                onChange={(event) => onRowChange(row.id, { description: event.target.value })}
              />
            </label>
            <label className="space-y-1 text-xs sm:col-span-2">
              <span className="font-medium text-muted-foreground">Details</span>
              <Input
                value={row.details.join(" · ")}
                disabled={disabled || isImporting || !canEdit || row.alreadyOnFile}
                className="h-8 text-xs"
                onChange={(event) => onRowChange(row.id, { details: parseDetailsField(event.target.value) })}
              />
            </label>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function RmvImportReview({
  vehicleLabel,
  rows,
  disabled = false,
  isImporting = false,
  onRowChange,
  onIncludeAllReady,
  onExcludeAll,
  onConfirm,
}: RmvImportReviewProps) {
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.recordDate.localeCompare(a.recordDate)),
    [rows],
  );
  const onFileRows = sortedRows.filter((row) => row.alreadyOnFile);
  const importRows = sortedRows.filter((row) => !row.alreadyOnFile);
  const vehicleRows = importRows.filter((row) => row.eventType !== "license");
  const ownerRows = importRows.filter((row) => row.eventType === "license");
  const selectedCount = importRows.filter((row) => row.included).length;
  const onFileCount = onFileRows.length;
  const readyCount = importRows.length;

  return (
    <div className="space-y-4">
      <div className="history-surface p-4">
        <p className="text-sm font-medium">Review your RMV / DMV records</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {vehicleLabel}
          {onFileCount > 0 ? ` · ${onFileCount} already on file` : ""}
          {readyCount > 0 ? ` · ${readyCount} new record${readyCount === 1 ? "" : "s"} ready` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {onFileCount > 0 ? <Badge variant="secondary">{onFileCount} on file</Badge> : null}
          {readyCount > 0 ? <Badge variant="secondary">{readyCount} ready</Badge> : null}
        </div>
      </div>

      {onFileCount > 0 ? (
        <details className="history-surface group px-3 py-2">
          <summary className="cursor-pointer list-none text-xs text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5 text-history-highlight transition-transform group-open:rotate-90" />
              {onFileCount} on file — skipped on re-import
            </span>
          </summary>
          <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
            {onFileRows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 text-xs text-muted-foreground"
              >
                <span className="tabular-nums">{formatRecordDate(row.recordDate)}</span>
                <span className="truncate">{row.description}</span>
                <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                  On file
                </Badge>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {importRows.length > 0 ? (
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
                Include all
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
          {vehicleRows.length > 0 ? (
            <section className="space-y-2">
              <div>
                <h4 className="text-sm font-medium">For this car</h4>
                <p className="text-xs text-muted-foreground">These ownership records stay with {vehicleLabel}.</p>
              </div>
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {vehicleRows.map((row) => (
                  <RmvReviewCard
                    key={row.id}
                    row={row}
                    disabled={disabled}
                    isImporting={isImporting}
                    defaultExpanded={row.ownerLicenseReview?.status === "missing_expiration"}
                    onRowChange={onRowChange}
                  />
                ))}
              </div>
            </section>
          ) : null}
          {ownerRows.length > 0 ? (
            <section className="space-y-2">
              <div>
                <h4 className="text-sm font-medium">For you</h4>
                <p className="text-xs text-muted-foreground">Driver's-license records are saved once to your owner profile, not to a car.</p>
              </div>
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {ownerRows.map((row) => (
                  <RmvReviewCard
                    key={row.id}
                    row={row}
                    disabled={disabled}
                    isImporting={isImporting}
                    defaultExpanded={row.ownerLicenseReview?.status === "missing_expiration"}
                    onRowChange={onRowChange}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </section>
      ) : null}

      <Button
        type="button"
        className="history-cta"
        disabled={disabled || isImporting || selectedCount === 0}
        onClick={onConfirm}
      >
        <FileJson className="mr-2 h-4 w-4" aria-hidden />
        {isImporting
          ? "Importing…"
          : selectedCount === 0 && onFileCount > 0
            ? "Nothing new to import"
            : `Confirm import (${selectedCount} new record${selectedCount === 1 ? "" : "s"})`}
      </Button>
      {selectedCount === 0 && importRows.length > 0 ? (
        <p className="text-xs text-destructive">
          {importRows.some((row) => row.ownerLicenseReview?.status === "review")
            ? "Your owner license stays unchanged until you choose Use imported update."
            : "Select at least one new record to import."}
        </p>
      ) : null}
    </div>
  );
}
