"use client";

import { FileJson, FileUp, Loader2, Upload } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  parseVehicleOsImportJson,
  parseVehicleOsRmvImportJson,
  RECORD_IMPORT_CATEGORIES,
  RMV_EVENT_LABELS,
  type RecordImportCategoryId,
  type VehicleOsImportV1,
  type VehicleOsRmvImportV1,
} from "@/lib/record-import-types";
import { cn } from "@/lib/utils";

type RecordImportPanelProps = {
  vehicleId: string;
  apiBase: string;
  disabled?: boolean;
  onError: (message: string) => void;
  onCarfaxImported: (body: {
    importedCount: number;
    timeline: unknown[];
    maintenanceSchedule?: unknown;
  }) => void;
  onRmvImported: (body: { importedCount: number; ownershipRecords: unknown[] }) => void;
};

const FLOW_STEPS = [
  "Log in to the portal and open the relevant vehicle page.",
  "Print the page → Save as PDF (Ctrl+P / Cmd+P).",
  "Upload PDF — assistant extracts rows for review.",
  "Confirm import — rows commit to your vehicle record.",
] as const;

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
    setJsonDraft(JSON.stringify(draft, null, 2));
    setParseError("");
    setExtractWarnings(warnings);
  };

  const applyRmvDraft = (draft: VehicleOsRmvImportV1, warnings: string[] = []) => {
    setRmvPreview(draft);
    setCarfaxPreview(null);
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

  const commitImport = async () => {
    setIsImporting(true);
    try {
      if (activeCategory === "carfax" && carfaxPreview) {
        const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(carfaxPreview),
        });
        const body = (await response.json()) as {
          error?: string;
          importedCount?: number;
          timeline?: unknown[];
          maintenanceSchedule?: unknown;
        };
        if (!response.ok) {
          onError(body.error ?? "Import failed.");
          return;
        }
        onCarfaxImported({
          importedCount: body.importedCount ?? carfaxPreview.services.length,
          timeline: body.timeline ?? [],
          maintenanceSchedule: body.maintenanceSchedule,
        });
      } else if (activeCategory === "rmv" && rmvPreview) {
        const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/import/rmv`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rmvPreview),
        });
        const body = (await response.json()) as {
          error?: string;
          importedCount?: number;
          ownershipRecords?: unknown[];
        };
        if (!response.ok) {
          onError(body.error ?? "RMV import failed.");
          return;
        }
        onRmvImported({
          importedCount: body.importedCount ?? rmvPreview.records.length,
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
    activeCategory === "carfax" ? (carfaxPreview?.services.length ?? 0) : (rmvPreview?.records.length ?? 0);

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
            <span className="text-xs text-muted-foreground truncate max-w-xs">{pdfFileName}</span>
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

      {activeCategory === "carfax" && carfaxPreview ? (
        <ImportReviewTable
          title={`Review before import · ${carfaxPreview.services.length} service row${carfaxPreview.services.length === 1 ? "" : "s"}`}
          subtitle={`${carfaxPreview.vehicle.year} ${carfaxPreview.vehicle.make} ${carfaxPreview.vehicle.model} · ${carfaxPreview.vehicle.currentMileage.toLocaleString()} mi`}
          disabled={disabled || isImporting}
          confirmLabel={isImporting ? "Importing…" : `Confirm import (${carfaxPreview.services.length} rows)`}
          onConfirm={() => void commitImport()}
        >
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Mileage</th>
                <th className="px-3 py-2 font-medium">Shop</th>
                <th className="px-3 py-2 font-medium">Line items</th>
              </tr>
            </thead>
            <tbody>
              {[...carfaxPreview.services]
                .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))
                .map((service, index) => (
                  <tr key={`${service.serviceDate}-${service.shop}-${index}`} className="border-t border-border/60">
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap">{service.serviceDate}</td>
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                      {service.mileage.toLocaleString()} mi
                    </td>
                    <td className="px-3 py-2">{service.shop}</td>
                    <td className="px-3 py-2 text-muted-foreground">{service.lineItems.join(" · ")}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </ImportReviewTable>
      ) : null}

      {activeCategory === "rmv" && rmvPreview ? (
        <ImportReviewTable
          title={`Review ownership records · ${rmvPreview.records.length} row${rmvPreview.records.length === 1 ? "" : "s"}`}
          subtitle="These do not appear on the maintenance timeline — the assistant uses them for ownership context."
          disabled={disabled || isImporting}
          confirmLabel={isImporting ? "Importing…" : `Confirm import (${rmvPreview.records.length} records)`}
          onConfirm={() => void commitImport()}
        >
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Agency</th>
                <th className="px-3 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {[...rmvPreview.records]
                .sort((a, b) => b.recordDate.localeCompare(a.recordDate))
                .map((record, index) => (
                  <tr key={`${record.recordDate}-${record.description}-${index}`} className="border-t border-border/60">
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap">{record.recordDate}</td>
                    <td className="px-3 py-2">{RMV_EVENT_LABELS[record.eventType]}</td>
                    <td className="px-3 py-2">{record.agency}</td>
                    <td className="px-3 py-2 text-muted-foreground">{record.details.join(" · ")}</td>
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
  disabled,
  confirmLabel,
  onConfirm,
  children,
}: {
  title: string;
  subtitle: string;
  disabled: boolean;
  confirmLabel: string;
  onConfirm: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="max-h-80 overflow-auto rounded-md border border-border">{children}</div>
      <Button type="button" disabled={disabled} onClick={onConfirm}>
        <FileJson className="mr-2 h-4 w-4" aria-hidden />
        {confirmLabel}
      </Button>
    </div>
  );
}
