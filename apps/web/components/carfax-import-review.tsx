"use client";

import { CheckCircle2, ChevronRight, ChevronUp, FileJson, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { ExtractionStatusBanner } from "@/components/extraction-status-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  isVisitOnlyServiceRecord,
  resolveCarfaxSourceTrust,
  type ImportLocationEvidence,
  type ImportTrustTier,
  type ImportVerifyGuidance,
  type TierImportSummary,
} from "@vehicleos/domain";
import { isoDateToLocalDate } from "@/lib/date-input";
import { cn } from "@/lib/utils";
import type { VehicleOsImportService } from "@/lib/record-import-types";

export type OwnerReviewPhase = "none" | "active" | "awaiting_confirm" | "done";

export type CarfaxReviewRow = VehicleOsImportService & {
  id: string;
  included: boolean;
  tier: ImportTrustTier;
  tierReasons: string[];
  ownerGuidance: ImportVerifyGuidance[];
  ownerReviewPhase: OwnerReviewPhase;
  assistantVerdict?: string;
  alreadyOnFile?: boolean;
  locationCandidates?: string[];
  locationEvidence?: ImportLocationEvidence;
};

type CarfaxImportReviewProps = {
  vehicleLabel: string;
  summary: TierImportSummary;
  rows: CarfaxReviewRow[];
  disabled?: boolean;
  isImporting?: boolean;
  onRowChange: (id: string, patch: Partial<CarfaxReviewRow>) => void;
  onConfirmReview: (id: string) => void;
  onAcceptAsReported: (id: string) => void;
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

const isInReviewQueue = (row: CarfaxReviewRow): boolean =>
  row.ownerReviewPhase === "active" || row.ownerReviewPhase === "awaiting_confirm";

const locationEvidenceText = (row: CarfaxReviewRow): string => {
  const evidence = row.locationEvidence;
  if (!evidence) {
    return row.shopLocation ? `CARFAX location: ${row.shopLocation}` : "Location was not provided.";
  }

  switch (evidence.status) {
    case "geoapify":
      return `Geoapify matched: ${evidence.location}`;
    case "carfax_reported":
      return `CARFAX reported: ${evidence.location}`;
    case "owner_memory":
      return `Your saved shop location: ${evidence.location}`;
    case "curated_pack":
      return `Known shop location: ${evidence.location}`;
    case "owner_reported":
      return "Owner-reported work — no shop location to validate";
    case "owner_diy":
      return "DIY work — no shop location to validate";
    case "state_record":
      return "State inspection record — no individual shop location supplied";
    case "ambiguous":
      return "Location needs your confirmation";
    case "not_initialized":
    case "not_found":
      return evidence.message ?? "Location could not be validated";
  }
};

const tierBadgeVariant = (row: CarfaxReviewRow): "secondary" | "warning" | "destructive" => {
  if (row.alreadyOnFile) return "secondary";
  if (isInReviewQueue(row)) return "warning";
  if (row.tier === "verify") return "warning";
  if (row.tier === "block") return "destructive";
  return "secondary";
};

const tierLabel = (row: CarfaxReviewRow): string => {
  if (isVisitOnlyServiceRecord({ source: "carfax_import", lineItems: row.lineItems })) {
    return "Limited details";
  }
  if (row.alreadyOnFile) return "On file";
  if (row.ownerReviewPhase === "done" && row.tier === "verify") return "Accepted";
  if (row.tier === "auto") return "Ready";
  if (row.tier === "enriched") return "Cleaned";
  if (row.tier === "verify" && resolveCarfaxSourceTrust(row.shop) !== "provider") return "Confirm";
  if (row.tier === "verify") return "Review";
  return "Blocked";
};

function ReviewCard({
  row,
  disabled,
  isImporting,
  defaultExpanded,
  onRowChange,
  onConfirmReview,
  onAcceptAsReported,
}: {
  row: CarfaxReviewRow;
  disabled: boolean;
  isImporting: boolean;
  defaultExpanded: boolean;
  onRowChange: (id: string, patch: Partial<CarfaxReviewRow>) => void;
  onConfirmReview: (id: string) => void;
  onAcceptAsReported: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [addingDetails, setAddingDetails] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState("");
  const visitOnly = isVisitOnlyServiceRecord({ source: "carfax_import", lineItems: row.lineItems });
  const previewItem = visitOnly ? "Dealer visit" : row.lineItems[0];
  const extraCount = row.lineItems.length - 1;
  const inReview = isInReviewQueue(row);
  const sourceTrust = resolveCarfaxSourceTrust(row.shop);
  const acceptAsReportedLabel =
    sourceTrust === "owner_reported"
      ? "I recognize this owner-reported work"
      : sourceTrust === "owner_diy"
        ? "I recognize this DIY work"
        : sourceTrust === "state_record"
          ? "I recognize this state inspection"
          : "CARFAX looks correct";

  return (
    <article
      className={cn(
        "rounded-lg border bg-card transition-all duration-150",
        row.alreadyOnFile
          ? "border-border/50 opacity-70"
          : row.included
            ? "border-border/80 history-interactive"
            : "border-border/50 opacity-60",
        inReview && row.included && !row.alreadyOnFile && "border-amber-500/40",
        row.tier === "block" && "border-destructive/40",
      )}
    >
      <div className="flex items-start gap-3 p-3">
        <Checkbox
          checked={row.included}
          disabled={disabled || isImporting || row.tier === "block"}
          aria-label={`Include service on ${row.serviceDate}`}
          className="mt-1"
          onCheckedChange={(checked) => onRowChange(row.id, { included: checked === true })}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium tabular-nums">{formatServiceDate(row.serviceDate)}</p>
            <span className="text-xs text-muted-foreground tabular-nums">
              {row.mileage.toLocaleString()} mi
            </span>
            <Badge variant={tierBadgeVariant(row)} className="text-[10px] uppercase tracking-wide">
              {tierLabel(row)}
            </Badge>
          </div>
          <p className="text-sm text-foreground">{formatShopLine(row)}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {locationEvidenceText(row)}
          </p>
          {!expanded ? (
            <p className="text-xs text-muted-foreground">
              {previewItem}
              {extraCount > 0 ? ` · +${extraCount} more` : ""}
            </p>
          ) : null}
          {inReview && row.ownerReviewPhase === "active" && row.ownerGuidance.length > 0 ? (
            <ul className="space-y-2 pt-1">
              {row.ownerGuidance.map((guidance) => (
                <li
                  key={guidance.code}
                  className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-xs text-amber-950 dark:text-amber-100"
                >
                  <p className="font-medium">{guidance.title}</p>
                  <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">{guidance.detail}</p>
                  <p className="mt-1.5 font-medium text-amber-950 dark:text-amber-50">
                    What to do: {guidance.resolve}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
          {inReview && row.assistantVerdict ? (
            <div
              className={cn(
                "rounded-md border px-2.5 py-2 text-xs",
                row.ownerReviewPhase === "awaiting_confirm"
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100"
                  : "border-amber-500/30 bg-amber-500/5 text-amber-950 dark:text-amber-100",
              )}
            >
              <p className="flex items-center gap-1.5 font-medium">
                {row.ownerReviewPhase === "awaiting_confirm" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : null}
                Assistant check
              </p>
              <p className="mt-1">{row.assistantVerdict}</p>
              {row.ownerReviewPhase === "awaiting_confirm" ? (
                <Button
                  type="button"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  disabled={disabled || isImporting}
                  onClick={() => onConfirmReview(row.id)}
                >
                  Add to ready import
                </Button>
              ) : null}
            </div>
          ) : null}
          {inReview && row.ownerReviewPhase === "active" && !row.assistantVerdict ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                aria-label={acceptAsReportedLabel}
                title={acceptAsReportedLabel}
                disabled={disabled || isImporting || !row.included}
                onClick={() => onAcceptAsReported(row.id)}
              >
                {acceptAsReportedLabel}
              </Button>
            </div>
          ) : null}
          {visitOnly ? (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              <span>CARFAX confirms a visit, but does not list the work performed.</span>
              {!expanded ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs text-history-highlight hover:bg-history-highlight/10 hover:text-history-highlight"
                  disabled={disabled || isImporting || !row.included}
                  onClick={() => {
                    setAddingDetails(true);
                    setExpanded(true);
                  }}
                >
                  Add details
                </Button>
              ) : null}
            </div>
          ) : !inReview && row.tierReasons.length > 0 ? (
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
          className="h-8 w-8 shrink-0 p-0 text-history-highlight hover:bg-history-highlight/10 hover:text-history-highlight"
          disabled={disabled || isImporting}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse row" : "Expand row"}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
                      className="h-7 border-history-highlight/30 text-xs hover:bg-history-highlight/10 hover:text-history-highlight"
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
          {visitOnly || addingDetails ? (
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">What work was performed?</span>
              <Textarea
                value={detailsDraft}
                disabled={disabled || isImporting || !row.included}
                placeholder="Optional — for example, Oil change"
                className="min-h-20 text-xs"
                onChange={(event) => {
                  setAddingDetails(true);
                  setDetailsDraft(event.target.value);
                  const lineItems = event.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean);
                  if (lineItems.length > 0) onRowChange(row.id, { lineItems });
                }}
              />
              <span className="block text-muted-foreground">
                Adding a service makes this record available for maintenance timing.
              </span>
            </label>
          ) : (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {row.lineItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
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
  onConfirmReview,
  onAcceptAsReported,
  onIncludeAllReady,
  onExcludeAll,
  onConfirm,
}: CarfaxImportReviewProps) {
  const selectedCount = rows.filter((row) => row.included).length;
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate)),
    [rows],
  );
  const onFileRows = sortedRows.filter((row) => row.alreadyOnFile);
  const importRows = sortedRows.filter((row) => !row.alreadyOnFile);
  const verifyRows = importRows.filter(isInReviewQueue);
  const readyRows = importRows.filter((row) => !isInReviewQueue(row) && row.tier !== "block");
  const blockRows = importRows.filter((row) => row.tier === "block");
  const reviewCount = verifyRows.length;
  const readyCount = readyRows.length;
  const onFileCount = onFileRows.length;

  const needsLocationPick = verifyRows.some((row) => (row.locationCandidates?.length ?? 0) > 0);
  const needsManualLocation = verifyRows.some((row) =>
    row.ownerGuidance.some((guidance) => guidance.code === "missing_shop_location"),
  );

  return (
    <div className="space-y-4">
      {needsLocationPick ? (
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          Geocoding found more than one match for a shop — pick the correct city below.
        </p>
      ) : null}
      {needsManualLocation ? <ExtractionStatusBanner variant="upcoming-places-lookup" /> : null}
      <div className="history-surface p-4">
        <p className="text-sm font-medium">Assistant reviewed your CARFAX history</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {vehicleLabel}
          {onFileCount > 0 ? ` · ${onFileCount} already on file` : ""}
          {readyCount > 0 ? ` · ${readyCount} new record${readyCount === 1 ? "" : "s"} ready` : ""}
          {reviewCount > 0
            ? ` · ${reviewCount} need${reviewCount === 1 ? "s" : ""} a quick look`
            : ""}
          {summary.blockCount > 0 ? ` · ${summary.blockCount} blocked` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {onFileCount > 0 ? <Badge variant="secondary">{onFileCount} on file</Badge> : null}
          {readyCount > 0 ? <Badge variant="secondary">{readyCount} ready</Badge> : null}
          {reviewCount > 0 ? <Badge variant="warning">{reviewCount} review</Badge> : null}
          {summary.blockCount > 0 ? (
            <Badge variant="destructive">{summary.blockCount} blocked</Badge>
          ) : null}
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
                <span className="tabular-nums">{formatServiceDate(row.serviceDate)}</span>
                <span className="truncate">{row.shop}</span>
                <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                  On file
                </Badge>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {verifyRows.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Needs your review</h3>
          <p className="text-xs text-muted-foreground">
            Fix a row or confirm CARFAX is correct — the assistant re-checks before moving it to ready.
          </p>
          <div className="space-y-2">
            {verifyRows.map((row) => (
              <ReviewCard
                key={row.id}
                row={row}
                disabled={disabled}
                isImporting={isImporting}
                defaultExpanded
                onRowChange={onRowChange}
                onConfirmReview={onConfirmReview}
                onAcceptAsReported={onAcceptAsReported}
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
                onConfirmReview={onConfirmReview}
                onAcceptAsReported={onAcceptAsReported}
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
                onConfirmReview={onConfirmReview}
                onAcceptAsReported={onAcceptAsReported}
              />
            ))}
          </div>
        </section>
      ) : null}

      <Button
        type="button"
        className="history-cta"
        disabled={disabled || isImporting || selectedCount === 0 || reviewCount > 0}
        onClick={onConfirm}
      >
        <FileJson className="mr-2 h-4 w-4" aria-hidden />
        {isImporting
          ? "Importing…"
          : reviewCount > 0
            ? `Confirm ${reviewCount} row${reviewCount === 1 ? "" : "s"} first`
          : selectedCount === 0 && onFileCount > 0
            ? "Nothing new to import"
            : `Confirm import (${selectedCount} new record${selectedCount === 1 ? "" : "s"})`}
      </Button>
      {reviewCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {reviewCount} record{reviewCount === 1 ? "" : "s"} still in review — import ready rows now, or finish
          review first.
        </p>
      ) : null}
      {selectedCount === 0 && importRows.length > 0 ? (
        <p className="text-xs text-destructive">Select at least one new record to import.</p>
      ) : null}
    </div>
  );
}
