"use client";

import { useEffect, useState } from "react";
import { FileDropzone } from "@/components/file-dropzone";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MANUAL_UPLOAD_DROPZONE_HINT,
  MANUAL_UPLOAD_GUIDANCE,
  MAX_MANUAL_BYTES,
  manualFileTooLargeMessage,
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
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const loadPreview = async () => {
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
    } catch (error) {
      onError(error instanceof Error ? error.message : "Preview failed.");
    } finally {
      setIsPreviewing(false);
    }
  };

  useEffect(() => {
    void loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when vehicle context changes
  }, [vehicleId, vehicle.year, vehicle.make, vehicle.model]);

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
          throw new Error(
            error.message.includes("maximum")
              ? "Manual PDF exceeds storage limit — ask admin to run migration 004_manual_storage_limit.sql (50 MB)."
              : error.message || "Upload to storage failed.",
          );
        }
      }

      setStorageKey(urlBody.storageKey);
      setFileName(file.name);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmSchedule = async () => {
    if (!storageKey) {
      onError("Upload your OEM manual PDF first.");
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload your owner manual or maintenance schedule PDF. Review the intervals, then save — this becomes baseline
        context for recommendations.
      </p>

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

      {fileName ? <p className="text-sm font-medium">Stored · {fileName}</p> : null}
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
        disabled={disabled || isConfirming || isUploading || !storageKey}
        onClick={() => void confirmSchedule()}
      >
        {isConfirming ? "Saving knowledge base…" : "Confirm schedule → feed rules engine"}
      </Button>
    </div>
  );
}
