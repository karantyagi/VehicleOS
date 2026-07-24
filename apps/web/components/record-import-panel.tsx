"use client";

import { FileJson, FileUp, Lock, Upload } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  parseVehicleOsImportJson,
  RECORD_IMPORT_CATEGORIES,
  type RecordImportCategoryId,
  type VehicleOsImportV1,
} from "@/lib/record-import-types";
import { cn } from "@/lib/utils";

type RecordImportPanelProps = {
  vehicleId: string;
  apiBase: string;
  disabled?: boolean;
  onError: (message: string) => void;
  onImported: (body: {
    importedCount: number;
    timeline: unknown[];
    maintenanceSchedule?: unknown;
  }) => void;
};

const CARFAX_FLOW_STEPS = [
  "Log in to CARFAX Car Care and open Service History.",
  "Print the page → Save as PDF (Ctrl+P / Cmd+P).",
  "Upload PDF — assistant extracts rows (under development).",
  "Review extracted rows, then confirm import.",
] as const;

export function RecordImportPanel({
  vehicleId,
  apiBase,
  disabled = false,
  onError,
  onImported,
}: RecordImportPanelProps) {
  const [activeCategory, setActiveCategory] = useState<RecordImportCategoryId>("carfax");
  const [jsonDraft, setJsonDraft] = useState("");
  const [preview, setPreview] = useState<VehicleOsImportV1 | null>(null);
  const [parseError, setParseError] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const category = useMemo(
    () => RECORD_IMPORT_CATEGORIES.find((entry) => entry.id === activeCategory) ?? RECORD_IMPORT_CATEGORIES[0],
    [activeCategory],
  );

  const loadJsonText = useCallback((raw: string) => {
    setJsonDraft(raw);
    if (!raw.trim()) {
      setPreview(null);
      setParseError("");
      return;
    }
    const result = parseVehicleOsImportJson(raw);
    if (!result.ok) {
      setPreview(null);
      setParseError(result.error);
      return;
    }
    setPreview(result.data);
    setParseError("");
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".json")) {
        onError("Choose a .json file (VehicleOSImport v1).");
        return;
      }
      const raw = await file.text();
      loadJsonText(raw);
    },
    [loadJsonText, onError],
  );

  const commitImport = async () => {
    if (!preview || activeCategory !== "carfax") return;
    setIsImporting(true);
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: preview.version,
          source: preview.source,
          exportedAt: preview.exportedAt,
          vehicle: preview.vehicle,
          services: preview.services,
        }),
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
      onImported({
        importedCount: body.importedCount ?? preview.services.length,
        timeline: body.timeline ?? [],
        maintenanceSchedule: body.maintenanceSchedule,
      });
      setJsonDraft("");
      setPreview(null);
      setParseError("");
    } catch {
      onError("Network error — try again.");
    } finally {
      setIsImporting(false);
    }
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
              onClick={() => setActiveCategory(entry.id)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{entry.label}</p>
                {entry.status === "coming-soon" ? (
                  <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wide">
                    Follow-up
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-wide">
                    JSON now
                  </Badge>
                )}
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

      {activeCategory === "carfax" ? (
        <>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">Import funnel</p>
              <Badge variant="secondary">Product shape</Badge>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CARFAX_FLOW_STEPS.map((step, index) => (
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
              <Label htmlFor="carfax-pdf-upload" className="text-sm font-medium">
                Upload CARFAX PDF
              </Label>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                Under development
              </Badge>
            </div>
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/30 px-4 py-8 text-center"
              aria-disabled="true"
            >
              <Lock className="h-5 w-5 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                PDF extraction ships with ENG-2. Use JSON import below for now.
              </p>
              <Button type="button" variant="outline" size="sm" disabled>
                <Upload className="mr-2 h-4 w-4" aria-hidden />
                Choose PDF
              </Button>
            </div>
          </div>

          <div className="space-y-3 border-t border-border/70 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="carfax-json" className="text-sm font-medium">
                Import JSON (early access)
              </Label>
              <Badge className="text-[10px] uppercase tracking-wide">Available now</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste or upload a <code className="text-[11px]">VehicleOSImport.v1</code> file — e.g. from{" "}
              <code className="text-[11px]">connectors/carfax-connect/examples/tlx-carfax-history.v1.json</code>.
            </p>
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
                      if (file) void handleFile(file);
                      event.target.value = "";
                    }}
                  />
                </label>
              </Button>
            </div>
            <Textarea
              id="carfax-json"
              value={jsonDraft}
              onChange={(event) => loadJsonText(event.target.value)}
              placeholder='{"version":"1","source":"carfax-pdf-manual",...}'
              rows={6}
              disabled={disabled}
              className="font-mono text-xs"
            />
            {parseError ? <p className="text-sm text-destructive">{parseError}</p> : null}
          </div>

          {preview ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Review before import · {preview.services.length} service row
                  {preview.services.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {preview.vehicle.year} {preview.vehicle.make} {preview.vehicle.model} ·{" "}
                  {preview.vehicle.currentMileage.toLocaleString()} mi
                </p>
              </div>
              <div className="max-h-80 overflow-auto rounded-md border border-border">
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
                    {[...preview.services]
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
              </div>
              <Button
                type="button"
                disabled={disabled || isImporting}
                onClick={() => void commitImport()}
              >
                <FileJson className="mr-2 h-4 w-4" aria-hidden />
                {isImporting ? "Importing…" : `Confirm import (${preview.services.length} rows)`}
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center">
          <Lock className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-medium">RMV / DMV import — follow-up</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Registration, title, and lien events are car-related but not maintenance. The assistant will track them
            separately once CARFAX import is validated on your TLX.
          </p>
          <Badge variant="secondary" className="mt-4">
            Same PDF → extract → review flow
          </Badge>
        </div>
      )}
    </div>
  );
}
