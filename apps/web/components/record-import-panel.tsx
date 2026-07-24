"use client";

import { FileJson, FileUp, Loader2, Upload } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  parseVehicleOsImportJson,
  parseVehicleOsRmvImportJson,
  RECORD_IMPORT_CATEGORIES,
  RMV_EVENT_LABELS,
  type RecordImportCategoryId,
  type VehicleOsImportV1,
  type VehicleOsImportService,
  type VehicleOsRmvImportV1,
  type VehicleOsRmvRecord,
} from "@/lib/record-import-types";
import { cn } from "@/lib/utils";

type RecordImportPanelProps = {
  vehicleId: string;
  apiBase: string;
  disabled?: boolean;
  onError: (message: string) => void;
  onCarfaxImported: (body: {
    importedCount: number;
    skippedCount?: number;
    timeline: unknown[];
    maintenanceSchedule?: unknown;
  }) => void;
  onRmvImported: (body: {
    importedCount: number;
    skippedCount?: number;
    ownershipRecords: unknown[];
  }) => void;
};

type CarfaxReviewRow = VehicleOsImportService & { id: string; included: boolean };
type RmvReviewRow = VehicleOsRmvRecord & { id: string; included: boolean };

const FLOW_STEPS = [
  "Log in to the portal and open the relevant vehicle page.",
  "Print the page → Save as PDF (Ctrl+P / Cmd+P).",
  "Upload PDF — assistant extracts rows for review.",
  "Edit or exclude rows, then confirm import.",
] as const;

const createRowId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const initCarfaxReviewRows = (services: VehicleOsImportService[]): CarfaxReviewRow[] =>
  services.map((service) => ({ ...service, id: createRowId(), included: true }));

const initRmvReviewRows = (records: VehicleOsRmvRecord[]): RmvReviewRow[] =>
  records.map((record) => ({ ...record, id: createRowId(), included: true }));

const parseLineItemsField = (raw: string): string[] =>
  raw
    .split(/[·;,]/)
    .map((line) => line.trim())
    .filter(Boolean);

const parseDetailsField = (raw: string): string[] =>
  raw
    .split(/[·;]/)
    .map((line) => line.trim())
    .filter(Boolean);

export function RecordImportPanel({
  vehicleId,
  apiBase,
  disabled = false,
  onError,
  onCarfaxImported,
  onRmvImported,
}: RecordImportPanelProps) {
  const [activeCategory, setActiveCategory] = useState<RecordImportCategoryId>("carfax");
  const [jsonDraft, setJsonDraft] = useState("");
  const [carfaxPreview, setCarfaxPreview] = useState<VehicleOsImportV1 | null>(null);
  const [rmvPreview, setRmvPreview] = useState<VehicleOsRmvImportV1 | null>(null);
  const [carfaxReviewRows, setCarfaxReviewRows] = useState<CarfaxReviewRow[]>([]);
  const [rmvReviewRows, setRmvReviewRows] = useState<RmvReviewRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [extractWarnings, setExtractWarnings] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);

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

  const applyCarfaxDraft = (draft: VehicleOsImportV1, warnings: string[] = []) => {
    setCarfaxPreview(draft);
    setRmvPreview(null);
    setRmvReviewRows([]);
    setCarfaxReviewRows(initCarfaxReviewRows(draft.services));
    setJsonDraft(JSON.stringify(draft, null, 2));
    setParseError("");
    setExtractWarnings(warnings);
  };

  const applyRmvDraft = (draft: VehicleOsRmvImportV1, warnings: string[] = []) => {
    setRmvPreview(draft);
    setCarfaxPreview(null);
    setCarfaxReviewRows([]);
    setRmvReviewRows(initRmvReviewRows(draft.records));
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
        applyCarfaxDraft(result.data);
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
    [activeCategory, resetPreview],
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
          services: selectedCarfaxRows.map(({ id: _id, included: _included, ...service }) => service),
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
        };
        if (!response.ok) {
          onError(body.error ?? "RMV import failed.");
          return;
        }
        onRmvImported({
          importedCount: body.importedCount ?? 0,
          skippedCount: body.skippedCount ?? 0,
          ownershipRecords: body.ownershipRecords ?? [],
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
    setCarfaxReviewRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const updateRmvRow = (id: string, patch: Partial<RmvReviewRow>) => {
    setRmvReviewRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const setAllCarfaxIncluded = (included: boolean) => {
    setCarfaxReviewRows((rows) => rows.map((row) => ({ ...row, included })));
  };

  const setAllRmvIncluded = (included: boolean) => {
    setRmvReviewRows((rows) => rows.map((row) => ({ ...row, included })));
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

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="record-import-pdf" className="text-sm font-medium">
            Upload PDF
          </Label>
          <Badge className="text-[10px] uppercase tracking-wide">Primary</Badge>
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
        <p className="text-xs text-muted-foreground">
          Rules-based extraction (v1). ENG-2 will add LLM assist with confidence scores for messy PDFs.
        </p>
      </div>

      <div className="space-y-3 border-t border-border/70 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="record-import-json" className="text-sm font-medium">
            Or import JSON
          </Label>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            Alternate
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
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
        <ImportReviewTable
          title={`Review before import · ${carfaxReviewRows.length} service row${carfaxReviewRows.length === 1 ? "" : "s"}`}
          subtitle={`${carfaxPreview.vehicle.year} ${carfaxPreview.vehicle.make} ${carfaxPreview.vehicle.model} · ${carfaxPreview.vehicle.currentMileage.toLocaleString()} mi · edit fields or uncheck rows to exclude`}
          selectedCount={selectedCarfaxRows.length}
          totalCount={carfaxReviewRows.length}
          disabled={disabled || isImporting}
          confirmLabel={
            isImporting
              ? "Importing…"
              : `Confirm import (${selectedCarfaxRows.length} of ${carfaxReviewRows.length} rows)`
          }
          onConfirm={() => void commitImport()}
          onIncludeAll={() => setAllCarfaxIncluded(true)}
          onExcludeAll={() => setAllCarfaxIncluded(false)}
        >
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr>
                <th className="w-10 px-2 py-2 font-medium">
                  <span className="sr-only">Include</span>
                </th>
                <th className="px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium">Mileage</th>
                <th className="px-2 py-2 font-medium">Shop</th>
                <th className="px-2 py-2 font-medium">Line items</th>
              </tr>
            </thead>
            <tbody>
              {[...carfaxReviewRows]
                .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))
                .map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-t border-border/60",
                      !row.included && "bg-muted/40 opacity-60",
                    )}
                  >
                    <td className="px-2 py-2 align-top">
                      <input
                        type="checkbox"
                        checked={row.included}
                        disabled={disabled || isImporting}
                        aria-label={`Include service on ${row.serviceDate}`}
                        className="h-4 w-4 rounded border-border"
                        onChange={(event) => updateCarfaxRow(row.id, { included: event.target.checked })}
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Input
                        value={row.serviceDate}
                        disabled={disabled || isImporting || !row.included}
                        className="h-8 min-w-[7rem] text-xs"
                        onChange={(event) => updateCarfaxRow(row.id, { serviceDate: event.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Input
                        type="number"
                        value={row.mileage}
                        disabled={disabled || isImporting || !row.included}
                        className="h-8 w-24 text-xs tabular-nums"
                        onChange={(event) =>
                          updateCarfaxRow(row.id, { mileage: Number(event.target.value) || 0 })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Input
                        value={row.shop}
                        disabled={disabled || isImporting || !row.included}
                        className="h-8 min-w-[8rem] text-xs"
                        onChange={(event) => updateCarfaxRow(row.id, { shop: event.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Input
                        value={row.lineItems.join(" · ")}
                        disabled={disabled || isImporting || !row.included}
                        className="h-8 min-w-[12rem] text-xs"
                        placeholder="Oil change · Filter"
                        onChange={(event) =>
                          updateCarfaxRow(row.id, { lineItems: parseLineItemsField(event.target.value) })
                        }
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </ImportReviewTable>
      ) : null}

      {activeCategory === "rmv" && rmvPreview && rmvReviewRows.length > 0 ? (
        <ImportReviewTable
          title={`Review ownership records · ${rmvReviewRows.length} row${rmvReviewRows.length === 1 ? "" : "s"}`}
          subtitle="Uncheck rows to exclude. Edits apply before commit. Ownership records do not appear on the maintenance timeline."
          selectedCount={selectedRmvRows.length}
          totalCount={rmvReviewRows.length}
          disabled={disabled || isImporting}
          confirmLabel={
            isImporting
              ? "Importing…"
              : `Confirm import (${selectedRmvRows.length} of ${rmvReviewRows.length} records)`
          }
          onConfirm={() => void commitImport()}
          onIncludeAll={() => setAllRmvIncluded(true)}
          onExcludeAll={() => setAllRmvIncluded(false)}
        >
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr>
                <th className="w-10 px-2 py-2 font-medium">
                  <span className="sr-only">Include</span>
                </th>
                <th className="px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium">Type</th>
                <th className="px-2 py-2 font-medium">Agency</th>
                <th className="px-2 py-2 font-medium">Description</th>
                <th className="px-2 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {[...rmvReviewRows]
                .sort((a, b) => b.recordDate.localeCompare(a.recordDate))
                .map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-t border-border/60",
                      !row.included && "bg-muted/40 opacity-60",
                    )}
                  >
                    <td className="px-2 py-2 align-top">
                      <input
                        type="checkbox"
                        checked={row.included}
                        disabled={disabled || isImporting}
                        aria-label={`Include ${RMV_EVENT_LABELS[row.eventType]} on ${row.recordDate}`}
                        className="h-4 w-4 rounded border-border"
                        onChange={(event) => updateRmvRow(row.id, { included: event.target.checked })}
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Input
                        value={row.recordDate}
                        disabled={disabled || isImporting || !row.included}
                        className="h-8 min-w-[7rem] text-xs"
                        onChange={(event) => updateRmvRow(row.id, { recordDate: event.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2 align-top text-muted-foreground">
                      {RMV_EVENT_LABELS[row.eventType]}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Input
                        value={row.agency}
                        disabled={disabled || isImporting || !row.included}
                        className="h-8 min-w-[8rem] text-xs"
                        onChange={(event) => updateRmvRow(row.id, { agency: event.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Input
                        value={row.description}
                        disabled={disabled || isImporting || !row.included}
                        className="h-8 min-w-[10rem] text-xs"
                        onChange={(event) => updateRmvRow(row.id, { description: event.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Input
                        value={row.details.join(" · ")}
                        disabled={disabled || isImporting || !row.included}
                        className="h-8 min-w-[12rem] text-xs"
                        onChange={(event) =>
                          updateRmvRow(row.id, { details: parseDetailsField(event.target.value) })
                        }
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </ImportReviewTable>
      ) : null}

      {rowCount === 0 && pdfFileName && !isExtracting && !parseError ? (
        <p className="text-sm text-muted-foreground">No rows extracted yet — try a different PDF export.</p>
      ) : null}
    </div>
  );
}

function ImportReviewTable({
  title,
  subtitle,
  selectedCount,
  totalCount,
  disabled,
  confirmLabel,
  onConfirm,
  onIncludeAll,
  onExcludeAll,
  children,
}: {
  title: string;
  subtitle: string;
  selectedCount: number;
  totalCount: number;
  disabled: boolean;
  confirmLabel: string;
  onConfirm: () => void;
  onIncludeAll: () => void;
  onExcludeAll: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">{title}</p>
          <div className="flex items-center gap-2">
            <Badge variant={selectedCount === 0 ? "warning" : "secondary"}>
              {selectedCount} selected
            </Badge>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" disabled={disabled} onClick={onIncludeAll}>
              Include all
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" disabled={disabled} onClick={onExcludeAll}>
              Exclude all
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="max-h-96 overflow-auto rounded-md border border-border">{children}</div>
      <Button type="button" disabled={disabled || selectedCount === 0} onClick={onConfirm}>
        <FileJson className="mr-2 h-4 w-4" aria-hidden />
        {confirmLabel}
      </Button>
      {selectedCount === 0 && totalCount > 0 ? (
        <p className="text-xs text-destructive">Select at least one row to import.</p>
      ) : null}
    </div>
  );
}
