"use client";

import { useState } from "react";
import { FileText, Mic, Paperclip, X } from "lucide-react";
import { MobileCaptureActions } from "@/components/mobile-capture-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MaintenanceRecordDraft } from "@/components/maintenance-record-fields";
import { cn } from "@/lib/utils";

const RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

type MaintenanceRecordEvidenceStripProps = {
  idPrefix: string;
  draft: MaintenanceRecordDraft;
  disabled?: boolean;
  vehicleId?: string;
  apiBase?: string;
  onDraftChange: (draft: MaintenanceRecordDraft) => void;
  onCaptureError?: (message: string) => void;
};

export function MaintenanceRecordEvidenceStrip({
  idPrefix,
  draft,
  disabled = false,
  vehicleId,
  apiBase,
  onDraftChange,
  onCaptureError,
}: MaintenanceRecordEvidenceStripProps) {
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);

  const canUpload = Boolean(vehicleId && apiBase);

  const uploadReceipt = async (file: File) => {
    if (!vehicleId || !apiBase) return;
    setIsUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/receipts/upload`, {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as {
        storageKey?: string;
        fileName?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Upload failed");
      onDraftChange({
        ...draft,
        evidenceStorageKey: body.storageKey,
        evidenceFileName: body.fileName ?? file.name,
        captureChannel: "receipt",
      });

      const extractResponse = await fetch(`${apiBase}/api/vehicles/${vehicleId}/receipts/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageKey: body.storageKey,
          channel: "receipt_upload",
          hintText: draft.lineItems.trim() || undefined,
          shop: draft.shop.trim() || undefined,
          serviceDate: draft.serviceDate,
          mileage: Number(draft.mileage),
          lineItems: draft.lineItems
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          total: draft.total.trim() || undefined,
        }),
      });
      const extractBody = (await extractResponse.json()) as {
        extracted?: {
          shop?: string;
          serviceDate?: string;
          mileage?: number;
          lineItems?: string[];
          total?: string;
        };
        error?: string;
      };
      if (extractResponse.ok && extractBody.extracted) {
        const extracted = extractBody.extracted;
        onDraftChange({
          ...draft,
          evidenceStorageKey: body.storageKey,
          evidenceFileName: body.fileName ?? file.name,
          captureChannel: "receipt",
          shop: draft.shop.trim() || extracted.shop || "",
          serviceDate: draft.serviceDate || extracted.serviceDate || draft.serviceDate,
          mileage:
            !draft.mileage.trim() && extracted.mileage
              ? String(extracted.mileage)
              : draft.mileage,
          lineItems:
            draft.lineItems.trim() ||
            (extracted.lineItems?.length ? extracted.lineItems.join("\n") : draft.lineItems),
          total: draft.total.trim() || extracted.total || draft.total,
        });
      }
    } catch (error) {
      onCaptureError?.(error instanceof Error ? error.message : "Could not attach receipt");
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const uploadVoice = async (file: File) => {
    if (!vehicleId || !apiBase) return;
    setIsUploadingVoice(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/voice/upload`, {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as {
        storageKey?: string;
        fileName?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Voice upload failed");
      onDraftChange({
        ...draft,
        voiceStorageKey: body.storageKey,
        voiceFileName: body.fileName ?? file.name,
        captureChannel: "voice",
      });
    } catch (error) {
      onCaptureError?.(error instanceof Error ? error.message : "Could not attach voice note");
    } finally {
      setIsUploadingVoice(false);
    }
  };

  const saveVoiceTranscript = async () => {
    if (!vehicleId || !apiBase || !draft.voiceTranscript.trim()) return;
    setIsUploadingVoice(true);
    try {
      const formData = new FormData();
      formData.append("transcript", draft.voiceTranscript.trim());
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/voice/upload`, {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as { storageKey?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not save voice note");
      onDraftChange({
        ...draft,
        voiceStorageKey: body.storageKey,
        voiceFileName: "voice-note.txt",
        captureChannel: "voice",
      });
    } catch (error) {
      onCaptureError?.(error instanceof Error ? error.message : "Could not save voice note");
    } finally {
      setIsUploadingVoice(false);
    }
  };

  const clearEvidence = () => {
    onDraftChange({
      ...draft,
      evidenceStorageKey: undefined,
      evidenceFileName: undefined,
      voiceStorageKey: undefined,
      voiceFileName: undefined,
      voiceTranscript: "",
      captureChannel: "manual",
    });
  };

  const hasAttachment = Boolean(draft.evidenceStorageKey || draft.voiceStorageKey);

  return (
    <div className="max-w-2xl space-y-3 rounded-lg border border-border/70 bg-muted/15 p-3">
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden />
        <Label className="text-xs font-medium text-foreground">Attach evidence (optional)</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Photo, PDF receipt, or voice note — helps the assistant match services and remember your decisions.
      </p>

      {hasAttachment ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/80 px-3 py-2 text-sm">
          {draft.evidenceFileName ? (
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <FileText className="h-3.5 w-3.5 text-primary" aria-hidden />
              {draft.evidenceFileName}
            </span>
          ) : null}
          {draft.voiceFileName ? (
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <Mic className="h-3.5 w-3.5 text-primary" aria-hidden />
              {draft.voiceFileName}
            </span>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto h-7 px-2 text-muted-foreground"
            disabled={disabled}
            onClick={clearEvidence}
          >
            <X className="mr-1 h-3.5 w-3.5" aria-hidden />
            Remove
          </Button>
        </div>
      ) : canUpload ? (
        <MobileCaptureActions
          accept={RECEIPT_ACCEPT}
          disabled={disabled}
          busy={isUploadingReceipt}
          onFile={(file) => void uploadReceipt(file)}
        />
      ) : (
        <p className="text-xs text-muted-foreground">Open your vehicle workspace to attach photos or PDFs.</p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-voice`} className="text-xs text-muted-foreground">
          Voice note or spoken summary
        </Label>
        <Textarea
          id={`${idPrefix}-voice`}
          rows={2}
          value={draft.voiceTranscript}
          disabled={disabled || isUploadingVoice}
          placeholder="e.g. Costco rotation only — skipped oil because dealer did it last month"
          onChange={(event) =>
            onDraftChange({ ...draft, voiceTranscript: event.target.value, captureChannel: "voice" })
          }
        />
        {canUpload && draft.voiceTranscript.trim() && !draft.voiceStorageKey ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || isUploadingVoice}
              onClick={() => void saveVoiceTranscript()}
            >
              Save voice text as evidence
            </Button>
            <label
              className={cn(
                "inline-flex h-8 cursor-pointer items-center rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-muted",
                (disabled || isUploadingVoice) && "pointer-events-none opacity-50",
              )}
            >
              <Mic className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Upload audio
              <input
                type="file"
                accept="audio/webm,audio/mpeg,audio/mp4,audio/wav,text/plain"
                className="sr-only"
                disabled={disabled || isUploadingVoice}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadVoice(file);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}
