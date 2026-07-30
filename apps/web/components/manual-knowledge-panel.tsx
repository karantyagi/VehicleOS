"use client";

import { FileUp } from "lucide-react";
import { useState } from "react";
import { ExtractionStatusBanner } from "@/components/extraction-status-banner";
import { DogfoodFixturePicker } from "@/components/dogfood-fixture-picker";
import { FileDropzone } from "@/components/file-dropzone";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_DOGFOOD_FIXTURE_ID,
  fetchDogfoodJson,
  getDogfoodFixtureProfile,
  type DogfoodFixtureId,
} from "@/lib/dogfood-fixtures";
import {
  parseManualScheduleImportJson,
  type ManualScheduleImportV1,
} from "@/lib/manual-schedule-import-types";
import {
  MANUAL_UPLOAD_DROPZONE_HINT,
  MANUAL_UPLOAD_GUIDANCE,
  MAX_MANUAL_BYTES,
  manualFileTooLargeMessage,
  mapManualStorageUploadError,
  manualStorageRejectedMessage,
} from "@/lib/manual-upload-limits";
import { createClient } from "@/lib/supabase/client";

const RECEIPT_BUCKET = "receipts";

type ManualUploadUrlResponse =
  | {
      mode: "signed";
      signedUrl: string;
      token: string;
      storageKey: string;
      error?: string;
    }
  | {
      mode: "session";
      storageKey: string;
      bucket: string;
      error?: string;
    }
  | {
      mode: "dev";
      storageKey: string;
      stored?: boolean;
      error?: string;
    }
  | {
      error?: string;
    };

type ScheduleRow = {
  serviceName: string;
  intervalMiles?: number;
  intervalMonths?: number;
  sourcePage?: string;
};

type ManualKnowledgePanelProps = {
  vehicleId: string;
  apiBase: string;
  vehicle: { year: number; make: string; model: string };
  disabled?: boolean;
  onConfirmed: (body: { nowQueue: unknown[]; knowledgeSchedule: unknown[] }) => void;
  onError: (message: string) => void;
};

export function ManualKnowledgePanel({
  vehicleId,
  apiBase,
  vehicle,
  disabled = false,
  onConfirmed,
  onError,
}: ManualKnowledgePanelProps) {
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [extractionNote, setExtractionNote] = useState("");
  const [jsonDraft, setJsonDraft] = useState("");
  const [parseError, setParseError] = useState("");
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoadingDogfood, setIsLoadingDogfood] = useState(false);
  const [selectedDogfoodId, setSelectedDogfoodId] = useState<DogfoodFixtureId>(DEFAULT_DOGFOOD_FIXTURE_ID);

  const applyManualDraft = (draft: ManualScheduleImportV1, note: string) => {
    setManualTitle(draft.manualTitle);
    setRows(draft.entries);
    setStorageKey(draft.storageKey ?? `dogfood/manual-schedule.v1.json`);
    setFileName(draft.storageKey ?? "manual-schedule.v1.json");
    setExtractionNote(note);
    setJsonDraft(JSON.stringify(draft, null, 2));
    setParseError("");
  };

  const loadJsonText = (raw: string) => {
    setJsonDraft(raw);
    if (!raw.trim()) {
      setParseError("");
      return;
    }
    const result = parseManualScheduleImportJson(raw);
    if (!result.ok) {
      setParseError(result.error);
      return;
    }
    applyManualDraft(result.data, "Loaded from JSON — review intervals before confirming.");
  };

  const loadDogfoodFixture = async () => {
    setIsLoadingDogfood(true);
    onError("");
    const profile = getDogfoodFixtureProfile(selectedDogfoodId);
    try {
      const draft = await fetchDogfoodJson<ManualScheduleImportV1>(profile.oemScheduleUrl);
      applyManualDraft(
        draft,
        `Dogfood OEM schedule loaded (${profile.label}) — review intervals before confirming.`,
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not load dogfood fixture.");
    } finally {
      setIsLoadingDogfood(false);
    }
  };

  const loadStubPreview = async () => {
    setIsPreviewing(true);
    onError("");
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/manuals/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
        }),
      });
      const body = (await response.json()) as {
        draft?: {
          manualTitle: string;
          extractionNote: string;
          entries: ScheduleRow[];
        };
        error?: string;
      };
      if (!response.ok || !body.draft) throw new Error(body.error ?? "Preview failed");
      setManualTitle(body.draft.manualTitle);
      setExtractionNote(body.draft.extractionNote);
      setRows(body.draft.entries);
      setParseError("");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Preview failed.");
    } finally {
      setIsPreviewing(false);
    }
  };

  const uploadManual = async (file: File) => {
    setIsUploading(true);
    onError("");
    try {
      if (file.size > MAX_MANUAL_BYTES) {
        throw new Error(manualFileTooLargeMessage(file.size));
      }

      const contentType = file.type || "application/pdf";
      const urlResponse = await fetch(`${apiBase}/api/vehicles/${vehicleId}/manuals/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType,
          fileSize: file.size,
        }),
      });
      const urlBody = (await urlResponse.json()) as ManualUploadUrlResponse;

      if (!urlResponse.ok || !("mode" in urlBody) || !urlBody.storageKey) {
        throw new Error(urlBody.error ?? "Upload preparation failed");
      }

      if (urlBody.mode === "signed") {
        const putResponse = await fetch(urlBody.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": contentType,
            Authorization: `Bearer ${urlBody.token}`,
          },
          body: file,
        });

        if (!putResponse.ok) {
          throw new Error(manualStorageRejectedMessage());
        }
      } else if (urlBody.mode === "session") {
        const supabase = createClient();
        const { error } = await supabase.storage.from(urlBody.bucket || RECEIPT_BUCKET).upload(urlBody.storageKey, file, {
          contentType,
          upsert: false,
        });

        if (error) {
          throw new Error(mapManualStorageUploadError(error.message));
        }
      }

      setStorageKey(urlBody.storageKey);
      setFileName(file.name);
      setExtractionNote("PDF stored — LLM parse not ready; load JSON dogfood or use stub preview, then edit rows.");
      if (rows.length === 0) {
        await loadStubPreview();
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmSchedule = async () => {
    if (!storageKey) {
      onError("Load a JSON schedule or upload your OEM manual PDF first.");
      return;
    }
    if (rows.length === 0) {
      onError("Confirm at least one maintenance interval row.");
      return;
    }

    setIsConfirming(true);
    onError("");
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/manuals/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageKey,
          manualTitle,
          entries: rows,
        }),
      });
      const body = (await response.json()) as {
        nowQueue: unknown[];
        knowledgeSchedule: unknown[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Confirm failed");
      onConfirmed(body);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Confirm failed.");
    } finally {
      setIsConfirming(false);
    }
  };

  const updateRow = (index: number, patch: Partial<ScheduleRow>) => {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const canConfirm = Boolean(storageKey) && rows.length > 0;

  return (
    <div className="space-y-4">
      <ExtractionStatusBanner variant="upcoming-oem-search" />
      <ExtractionStatusBanner variant="llm-not-ready-manual" />

      <p className="text-sm text-muted-foreground">
        Baseline maintenance intervals feed the schedule engine. For dogfood testing, load the JSON fixture; production
        will use LLM PDF parse or the upcoming search agent.
      </p>

      <div className="space-y-3 rounded-lg border border-border/80 bg-[hsl(var(--surface-inset))] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="manual-schedule-json" className="text-sm font-medium">
            Import schedule JSON (dogfood / testing)
          </Label>
        </div>
        <div className="space-y-3">
          <DogfoodFixturePicker
            value={selectedDogfoodId}
            onValueChange={setSelectedDogfoodId}
            disabled={disabled || isLoadingDogfood}
            id="manual-dogfood-fixture"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled || isLoadingDogfood}
              onClick={() => void loadDogfoodFixture()}
            >
              {isLoadingDogfood ? "Loading…" : "Load dogfood OEM JSON"}
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
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  loadJsonText(await file.text());
                  event.target.value = "";
                }}
              />
            </label>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isPreviewing}
            onClick={() => void loadStubPreview()}
          >
            {isPreviewing ? "Loading stub…" : "Load stub preview (dev)"}
          </Button>
          </div>
        </div>
        <Textarea
          id="manual-schedule-json"
          value={jsonDraft}
          onChange={(event) => loadJsonText(event.target.value)}
          placeholder='{"version":"1","manualTitle":"2021 Acura TLX…","entries":[...]}'
          rows={4}
          disabled={disabled}
          className="font-mono text-xs"
        />
        {parseError ? <p className="text-sm text-destructive">{parseError}</p> : null}
      </div>

      <div className="space-y-3 border-t border-border/70 pt-4">
        <p className="text-[13px] font-medium text-foreground">Or upload OEM manual PDF</p>
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {MANUAL_UPLOAD_GUIDANCE}
        </p>
        <FileDropzone
          label="Owner manual PDF"
          hint={MANUAL_UPLOAD_DROPZONE_HINT}
          accept="application/pdf"
          disabled={disabled || isConfirming}
          busy={isUploading}
          onFile={(file) => void uploadManual(file)}
        />
      </div>

      {fileName ? <p className="text-sm font-medium">Source · {fileName}</p> : null}
      {extractionNote ? <p className="text-xs text-muted-foreground">{extractionNote}</p> : null}

      <FormField label="Manual title" htmlFor="manual-title">
        <Input
          id="manual-title"
          value={manualTitle}
          disabled={disabled || isConfirming}
          onChange={(event) => setManualTitle(event.target.value)}
        />
      </FormField>

      {isPreviewing ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={`${row.serviceName}-${index}`} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-3">
              <FormField label="Service" htmlFor={`service-${index}`}>
                <Input
                  id={`service-${index}`}
                  value={row.serviceName}
                  disabled={disabled || isConfirming}
                  onChange={(event) => updateRow(index, { serviceName: event.target.value })}
                />
              </FormField>
              <FormField label="Miles" htmlFor={`miles-${index}`}>
                <Input
                  id={`miles-${index}`}
                  type="number"
                  value={row.intervalMiles ?? ""}
                  disabled={disabled || isConfirming}
                  onChange={(event) =>
                    updateRow(index, {
                      intervalMiles: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                />
              </FormField>
              <FormField label="Months" htmlFor={`months-${index}`}>
                <Input
                  id={`months-${index}`}
                  type="number"
                  value={row.intervalMonths ?? ""}
                  disabled={disabled || isConfirming}
                  onChange={(event) =>
                    updateRow(index, {
                      intervalMonths: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                />
              </FormField>
            </div>
          ))}
        </div>
      ) : null}

      <Button
        type="button"
        disabled={disabled || isConfirming || isUploading || !canConfirm}
        onClick={() => void confirmSchedule()}
      >
        {isConfirming ? "Saving knowledge base…" : "Confirm schedule → feed rules engine"}
      </Button>
    </div>
  );
}
