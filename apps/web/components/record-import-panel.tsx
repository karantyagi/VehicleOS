"use client";

import { FileJson, FileUp, Loader2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExtractionStatusBanner } from "@/components/extraction-status-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CarfaxImportReview, type CarfaxReviewRow } from "@/components/carfax-import-review";
import { RmvImportReview, type RmvReviewRow } from "@/components/rmv-import-review";
import {
  parseVehicleOsImportJson,
  parseVehicleOsRmvImportJson,
  RECORD_IMPORT_CATEGORIES,
  type RecordImportCategoryId,
  type VehicleOsImportV1,
  type VehicleOsImportService,
  type VehicleOsRmvImportV1,
  type VehicleOsRmvRecord,
} from "@/lib/record-import-types";
import {
  acceptImportRowAsReportedMessage,
  enrichVehicleOsImport,
  evaluateImportReviewVerdict,
  isDuplicateServiceRow,
  normalizeShopKey,
  tierImportRows,
  type ShopLocationHint,
  ownershipRecordFingerprint,
} from "@vehicleos/domain";
import { DOGFOOD_FIXTURES, fetchDogfoodJson } from "@/lib/extraction-status";
import type { OwnershipRecordEntry, TimelineEntry } from "@/lib/console-types";
import { cn } from "@/lib/utils";

type RecordImportPanelProps = {
  vehicleId: string;
  apiBase: string;
  ownerShopLocations?: Record<string, string>;
  existingTimeline?: TimelineEntry[];
  existingOwnershipRecords?: OwnershipRecordEntry[];
  disabled?: boolean;
  onActivityChange?: (active: boolean) => void;
  onError: (message: string) => void;
  onCarfaxImported: (body: {
    importedCount: number;
    skippedCount?: number;
    timeline: unknown[];
    maintenanceSchedule?: unknown;
    verificationTaskId?: string;
    importReview?: {
      autoCount: number;
      enrichedCount: number;
      verifyCount: number;
      blockCount: number;
    };
  }) => void;
  onRmvImported: (body: {
    importedCount: number;
    skippedCount?: number;
    ownershipRecords: unknown[];
    profilePatch?: { vin?: string; year?: number; make?: string; model?: string };
    verificationTaskId?: string;
  }) => void;
};

type RmvReviewRowState = RmvReviewRow;

const initRmvReviewRows = (
  records: VehicleOsRmvRecord[],
  existingOwnershipRecords: OwnershipRecordEntry[] = [],
): RmvReviewRowState[] =>
  records.map((record) => {
    const alreadyOnFile = existingOwnershipRecords.some(
      (existing) =>
        ownershipRecordFingerprint({
          recordDate: existing.recordDate,
          eventType: existing.eventType,
          agency: existing.agency,
          description: existing.description,
        }) === ownershipRecordFingerprint(record),
    );
    return {
      ...record,
      id: createRowId(),
      included: !alreadyOnFile,
      alreadyOnFile,
    };
  });

const createRowId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const stripCarfaxReviewUiFields = ({
  id: _id,
  included: _included,
  tier: _tier,
  tierReasons: _reasons,
  ownerGuidance: _guidance,
  ownerReviewPhase: _phase,
  assistantVerdict: _verdict,
  alreadyOnFile: _alreadyOnFile,
  locationCandidates: _candidates,
  ...service
}: CarfaxReviewRow): VehicleOsImportService => service;

const initCarfaxReviewRows = (
  services: VehicleOsImportService[],
  shopLocationHints?: Record<string, ShopLocationHint>,
  existingTimeline?: TimelineEntry[],
): CarfaxReviewRow[] => {
  const summary = tierImportRows(services);
  return summary.rows.map((tiered) => {
    const alreadyOnFile = existingTimeline
      ? isDuplicateServiceRow(existingTimeline, tiered.service)
      : false;

    return {
      ...tiered.service,
      id: createRowId(),
      included: alreadyOnFile ? false : tiered.tier !== "block",
      tier: tiered.tier,
      tierReasons: tiered.reasons,
      ownerGuidance: tiered.ownerGuidance,
      ownerReviewPhase: alreadyOnFile ? "done" : tiered.tier === "verify" ? "active" : "none",
      alreadyOnFile,
      locationCandidates: shopLocationHints?.[normalizeShopKey(tiered.service.shop)]?.candidates,
    };
  });
};

const reTierCarfaxRows = (rows: CarfaxReviewRow[]): CarfaxReviewRow[] => {
  const summary = tierImportRows(rows.map(stripCarfaxReviewUiFields));
  return rows.map((row, index) => {
    if (row.alreadyOnFile) {
      return { ...row, included: false, ownerReviewPhase: "done" as const };
    }

    const tiered = summary.rows[index];
    if (!tiered) return row;
    const wasIncluded = row.included;
    const hadLocation = Boolean(row.shopLocation?.trim());
    return {
      ...row,
      tier: tiered.tier,
      tierReasons: tiered.reasons,
      ownerGuidance: tiered.ownerGuidance,
      included: tiered.tier === "block" ? false : wasIncluded,
      locationCandidates: hadLocation ? undefined : row.locationCandidates,
    };
  });
};

const FLOW_STEPS = [
  "Log in to the portal and open the relevant vehicle page.",
  "Print the page → Save as PDF (Ctrl+P / Cmd+P).",
  "Upload PDF — assistant extracts and cleans rows.",
  "Review new rows only — matches already on file are skipped.",
] as const;

export function RecordImportPanel({
  vehicleId,
  apiBase,
  ownerShopLocations,
  existingTimeline = [],
  existingOwnershipRecords = [],
  disabled = false,
  onActivityChange,
  onError,
  onCarfaxImported,
  onRmvImported,
}: RecordImportPanelProps) {
  const [activeCategory, setActiveCategory] = useState<RecordImportCategoryId>("carfax");
  const [jsonDraft, setJsonDraft] = useState("");
  const [carfaxPreview, setCarfaxPreview] = useState<VehicleOsImportV1 | null>(null);
  const [rmvPreview, setRmvPreview] = useState<VehicleOsRmvImportV1 | null>(null);
  const [carfaxReviewRows, setCarfaxReviewRows] = useState<CarfaxReviewRow[]>([]);
  const [rmvReviewRows, setRmvReviewRows] = useState<RmvReviewRowState[]>([]);
  const [parseError, setParseError] = useState("");
  const [extractWarnings, setExtractWarnings] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isLoadingDogfood, setIsLoadingDogfood] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);

  useEffect(() => {
    onActivityChange?.(isImporting || isExtracting || isLoadingDogfood);
  }, [isExtracting, isImporting, isLoadingDogfood, onActivityChange]);

  const category = useMemo(
    () => RECORD_IMPORT_CATEGORIES.find((entry) => entry.id === activeCategory) ?? RECORD_IMPORT_CATEGORIES[0],
    [activeCategory],
  );

  const resetPreview = useCallback(() => {
    setCarfaxPreview(null);
    setRmvPreview(null);
    setCarfaxReviewRows([]);
    setRmvReviewRows([]);
    setParseError("");
    setExtractWarnings([]);
    setPdfFileName(null);
  }, []);

  const switchCategory = (next: RecordImportCategoryId) => {
    setActiveCategory(next);
    setJsonDraft("");
    resetPreview();
  };

  const applyCarfaxDraft = async (
    draft: VehicleOsImportV1,
    warnings: string[] = [],
    shopLocationHints?: Record<string, ShopLocationHint>,
  ) => {
    let enriched = enrichVehicleOsImport(draft, { ownerShopLocations });
    let hints = shopLocationHints;
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/import/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      if (response.ok) {
        const body = (await response.json()) as {
          draft?: VehicleOsImportV1;
          shopLocationHints?: Record<string, ShopLocationHint>;
        };
        if (body.draft) enriched = body.draft;
        if (body.shopLocationHints) hints = body.shopLocationHints;
      }
    } catch {
      // Client-side enrich fallback when server enrich is unavailable.
    }

    setCarfaxPreview(enriched);
    setRmvPreview(null);
    setRmvReviewRows([]);
    setCarfaxReviewRows(initCarfaxReviewRows(enriched.services, hints, existingTimeline));
    setJsonDraft(JSON.stringify(enriched, null, 2));
    setParseError("");
    setExtractWarnings(warnings);
  };

  const applyRmvDraft = (draft: VehicleOsRmvImportV1, warnings: string[] = []) => {
    setRmvPreview(draft);
    setCarfaxPreview(null);
    setCarfaxReviewRows([]);
    setRmvReviewRows(initRmvReviewRows(draft.records, existingOwnershipRecords));
    setJsonDraft(JSON.stringify(draft, null, 2));
    setParseError("");
    setExtractWarnings(warnings);
  };

  const loadJsonText = useCallback(
    (raw: string) => {
      setJsonDraft(raw);
      if (!raw.trim()) {
        resetPreview();
        return;
      }

      if (activeCategory === "carfax") {
        const result = parseVehicleOsImportJson(raw);
        if (!result.ok) {
          resetPreview();
          setParseError(result.error);
          return;
        }
        void applyCarfaxDraft(result.data);
        return;
      }

      const result = parseVehicleOsRmvImportJson(raw);
      if (!result.ok) {
        resetPreview();
        setParseError(result.error);
        return;
      }
      applyRmvDraft(result.data);
    },
    [activeCategory, resetPreview, ownerShopLocations, existingTimeline, apiBase, vehicleId],
  );

  const handleJsonFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".json")) {
        onError("Choose a .json import file.");
        return;
      }
      const raw = await file.text();
      loadJsonText(raw);
    },
    [loadJsonText, onError],
  );

  const loadDogfoodFixture = async () => {
    setIsLoadingDogfood(true);
    setParseError("");
    try {
      if (activeCategory === "carfax") {
        const draft = await fetchDogfoodJson<VehicleOsImportV1>(DOGFOOD_FIXTURES.carfax);
        await applyCarfaxDraft(draft, ["Dogfood CARFAX JSON loaded — review rows before confirming."]);
        return;
      }
      const draft = await fetchDogfoodJson<VehicleOsRmvImportV1>(DOGFOOD_FIXTURES.rmv);
      applyRmvDraft(draft, ["Dogfood RMV JSON loaded — review records before confirming."]);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not load dogfood fixture.");
    } finally {
      setIsLoadingDogfood(false);
    }
  };

  const handlePdfFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      onError("Choose a PDF file.");
      return;
    }

    setIsExtracting(true);
    setParseError("");
    resetPreview();
    setPdfFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", activeCategory);

      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/import/extract`, {
        method: "POST",
        body: formData,
      });

      const body = (await response.json()) as {
        error?: string;
        category?: RecordImportCategoryId;
        warnings?: string[];
        draft?: VehicleOsImportV1 | VehicleOsRmvImportV1;
      };

      if (!response.ok) {
        onError(body.error ?? "PDF extraction failed.");
        setPdfFileName(null);
        return;
      }

      if (body.category === "carfax" && body.draft && "services" in body.draft) {
        applyCarfaxDraft(body.draft, body.warnings ?? []);
        return;
      }

      if (body.category === "rmv" && body.draft && "records" in body.draft) {
        applyRmvDraft(body.draft as VehicleOsRmvImportV1, body.warnings ?? []);
        return;
      }

      onError("Unexpected extraction response.");
    } catch {
      onError("Network error during PDF extraction.");
      setPdfFileName(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const carfaxTierSummary = useMemo(
    () => tierImportRows(carfaxReviewRows.map(stripCarfaxReviewUiFields)),
    [carfaxReviewRows],
  );

  const selectedCarfaxRows = useMemo(
    () => carfaxReviewRows.filter((row) => row.included),
    [carfaxReviewRows],
  );
  const selectedRmvRows = useMemo(() => rmvReviewRows.filter((row) => row.included), [rmvReviewRows]);

  const commitImport = async () => {
    setIsImporting(true);
    try {
      if (activeCategory === "carfax" && carfaxPreview) {
        if (selectedCarfaxRows.length === 0) {
          onError("Select at least one service row to import.");
          return;
        }

        for (const row of selectedCarfaxRows) {
          if (!row.serviceDate.trim()) {
            onError("Every included row needs a service date.");
            return;
          }
          if (!Number.isFinite(row.mileage)) {
            onError("Every included row needs a valid mileage.");
            return;
          }
          if (row.lineItems.length === 0) {
            onError("Every included row needs at least one line item.");
            return;
          }
        }

        const payload: VehicleOsImportV1 = {
          ...carfaxPreview,
          services: selectedCarfaxRows.map(stripCarfaxReviewUiFields),
        };

        const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await response.json()) as {
          error?: string;
          importedCount?: number;
          skippedCount?: number;
          timeline?: unknown[];
          maintenanceSchedule?: unknown;
          verificationTaskId?: string;
          importReview?: {
            autoCount: number;
            enrichedCount: number;
            verifyCount: number;
            blockCount: number;
          };
        };
        if (!response.ok) {
          onError(body.error ?? "Import failed.");
          return;
        }
        onCarfaxImported({
          importedCount: body.importedCount ?? 0,
          skippedCount: body.skippedCount ?? 0,
          timeline: body.timeline ?? [],
          maintenanceSchedule: body.maintenanceSchedule,
          verificationTaskId: body.verificationTaskId,
          importReview: body.importReview,
        });
      } else if (activeCategory === "rmv" && rmvPreview) {
        if (selectedRmvRows.length === 0) {
          onError("Select at least one ownership record to import.");
          return;
        }

        for (const row of selectedRmvRows) {
          if (!row.recordDate.trim()) {
            onError("Every included row needs a record date.");
            return;
          }
          if (!row.description.trim()) {
            onError("Every included row needs a description.");
            return;
          }
          if (row.details.length === 0) {
            onError("Every included row needs at least one detail line.");
            return;
          }
        }

        const payload: VehicleOsRmvImportV1 = {
          ...rmvPreview,
          records: selectedRmvRows.map(({ id: _id, included: _included, ...record }) => record),
        };

        const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/import/rmv`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await response.json()) as {
          error?: string;
          importedCount?: number;
          skippedCount?: number;
          ownershipRecords?: unknown[];
          profilePatch?: { vin?: string; year?: number; make?: string; model?: string };
          verificationTaskId?: string;
        };
        if (!response.ok) {
          onError(body.error ?? "RMV import failed.");
          return;
        }
        onRmvImported({
          importedCount: body.importedCount ?? 0,
          skippedCount: body.skippedCount ?? 0,
          ownershipRecords: body.ownershipRecords ?? [],
          profilePatch: body.profilePatch,
          verificationTaskId: body.verificationTaskId,
        });
      } else {
        return;
      }

      setJsonDraft("");
      resetPreview();
    } catch {
      onError("Network error — try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const rowCount =
    activeCategory === "carfax" ? carfaxReviewRows.length : rmvReviewRows.length;

  const updateCarfaxRow = (id: string, patch: Partial<CarfaxReviewRow>) => {
    setCarfaxReviewRows((rows) => {
      const priorRow = rows.find((row) => row.id === id);
      const priorGuidanceCodes = priorRow?.ownerGuidance.map((guidance) => guidance.code);

      const merged = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
      const reTiered = reTierCarfaxRows(merged);

      return reTiered.map((row) => {
        if (row.id !== id) return row;
        if (row.ownerReviewPhase !== "active" && row.ownerReviewPhase !== "awaiting_confirm") {
          return row;
        }

        const verdict = evaluateImportReviewVerdict({
          tier: row.tier,
          ownerGuidance: row.ownerGuidance,
          priorGuidanceCodes,
        });

        return {
          ...row,
          ownerReviewPhase: verdict.status === "clear" ? "awaiting_confirm" : "active",
          assistantVerdict: verdict.message,
        };
      });
    });
  };

  const confirmCarfaxReview = (id: string) => {
    setCarfaxReviewRows((rows) =>
      rows.map((row) =>
        row.id === id ? { ...row, ownerReviewPhase: "done", assistantVerdict: undefined } : row,
      ),
    );
  };

  const acceptCarfaxAsReported = (id: string) => {
    setCarfaxReviewRows((rows) =>
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              ownerReviewPhase: "done",
              assistantVerdict: acceptImportRowAsReportedMessage(),
            }
          : row,
      ),
    );
  };

  const updateRmvRow = (id: string, patch: Partial<RmvReviewRowState>) => {
    setRmvReviewRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const setAllCarfaxIncluded = (included: boolean) => {
    setCarfaxReviewRows((rows) =>
      rows.map((row) => ({
        ...row,
        included: row.alreadyOnFile || row.tier === "block" ? false : included,
      })),
    );
  };

  const includeAllReadyCarfax = () => {
    setCarfaxReviewRows((rows) =>
      rows.map((row) => ({
        ...row,
        included:
          !row.alreadyOnFile &&
          row.ownerReviewPhase !== "active" &&
          row.ownerReviewPhase !== "awaiting_confirm" &&
          row.tier !== "block"
            ? true
            : row.included,
      })),
    );
  };

  const setAllRmvIncluded = (included: boolean) => {
    setRmvReviewRows((rows) =>
      rows.map((row) => ({ ...row, included: row.alreadyOnFile ? false : included })),
    );
  };

  const includeAllReadyRmv = () => {
    setRmvReviewRows((rows) =>
      rows.map((row) => ({ ...row, included: row.alreadyOnFile ? false : true })),
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {RECORD_IMPORT_CATEGORIES.map((entry) => {
          const isActive = entry.id === activeCategory;
          return (
            <button
              key={entry.id}
              type="button"
              disabled={disabled}
              onClick={() => switchCategory(entry.id)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{entry.label}</p>
                <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-wide">
                  PDF + JSON
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{entry.description}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-border/80 bg-[hsl(var(--surface-inset))] p-4">
        <p className="text-[13px] font-medium text-foreground">How to get your PDF</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-muted-foreground">
          {category.pdfInstructions.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">Import funnel</p>
          <Badge variant="secondary">Extract → review → confirm</Badge>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW_STEPS.map((step, index) => (
            <li
              key={step}
              className="rounded-md border border-border/70 bg-card p-3 text-xs leading-relaxed text-muted-foreground"
            >
              <span className="mb-1 block font-semibold tabular-nums text-foreground">Step {index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <ExtractionStatusBanner variant="llm-not-ready-pdf" />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="record-import-pdf" className="text-sm font-medium">
            Upload PDF
          </Label>
          <Badge className="text-[10px] uppercase tracking-wide">LLM upcoming</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={disabled || isExtracting} asChild>
            <label className="cursor-pointer">
              {isExtracting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="mr-2 h-4 w-4" aria-hidden />
              )}
              {isExtracting ? "Extracting…" : "Choose PDF"}
              <input
                id="record-import-pdf"
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                disabled={disabled || isExtracting}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handlePdfFile(file);
                  event.target.value = "";
                }}
              />
            </label>
          </Button>
          {pdfFileName ? (
            <span className="max-w-xs truncate text-xs text-muted-foreground">{pdfFileName}</span>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 border-t border-border/70 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="record-import-json" className="text-sm font-medium">
            Import JSON (dogfood / testing)
          </Label>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            Recommended for dogfood
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || isLoadingDogfood}
            onClick={() => void loadDogfoodFixture()}
          >
            {isLoadingDogfood
              ? "Loading…"
              : activeCategory === "carfax"
                ? "Load dogfood CARFAX JSON"
                : "Load dogfood RMV JSON"}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={disabled} asChild>
            <label className="cursor-pointer">
              <FileUp className="mr-2 h-4 w-4" aria-hidden />
              Choose JSON file
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                disabled={disabled}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleJsonFile(file);
                  event.target.value = "";
                }}
              />
            </label>
          </Button>
        </div>
        <Textarea
          id="record-import-json"
          value={jsonDraft}
          onChange={(event) => loadJsonText(event.target.value)}
          placeholder={
            activeCategory === "carfax"
              ? '{"version":"1","source":"carfax-pdf-manual",...}'
              : '{"version":"1","source":"rmv-pdf-manual",...}'
          }
          rows={5}
          disabled={disabled}
          className="font-mono text-xs"
        />
        {parseError ? <p className="text-sm text-destructive">{parseError}</p> : null}
        {extractWarnings.length > 0 ? (
          <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-400">
            {extractWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {activeCategory === "carfax" && carfaxPreview && carfaxReviewRows.length > 0 ? (
        <CarfaxImportReview
          vehicleLabel={`${carfaxPreview.vehicle.year} ${carfaxPreview.vehicle.make} ${carfaxPreview.vehicle.model} · ${carfaxPreview.vehicle.currentMileage.toLocaleString()} mi`}
          summary={carfaxTierSummary}
          rows={carfaxReviewRows}
          disabled={disabled}
          isImporting={isImporting}
          onRowChange={updateCarfaxRow}
          onConfirmReview={confirmCarfaxReview}
          onAcceptAsReported={acceptCarfaxAsReported}
          onIncludeAllReady={includeAllReadyCarfax}
          onExcludeAll={() => setAllCarfaxIncluded(false)}
          onConfirm={() => void commitImport()}
        />
      ) : null}

      {activeCategory === "rmv" && rmvPreview && rmvReviewRows.length > 0 ? (
        <RmvImportReview
          vehicleLabel={`${rmvPreview.vehicle.year} ${rmvPreview.vehicle.make} ${rmvPreview.vehicle.model}${
            rmvPreview.vehicle.currentMileage
              ? ` · ${rmvPreview.vehicle.currentMileage.toLocaleString()} mi`
              : ""
          }`}
          rows={rmvReviewRows}
          disabled={disabled}
          isImporting={isImporting}
          onRowChange={updateRmvRow}
          onIncludeAllReady={includeAllReadyRmv}
          onExcludeAll={() => setAllRmvIncluded(false)}
          onConfirm={() => void commitImport()}
        />
      ) : null}

      {rowCount === 0 && pdfFileName && !isExtracting && !parseError ? (
        <p className="text-sm text-muted-foreground">No rows extracted yet — try a different PDF export.</p>
      ) : null}
    </div>
  );
}
