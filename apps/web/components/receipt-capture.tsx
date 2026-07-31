"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDropzone } from "@/components/file-dropzone";
import { MobileCaptureActions } from "@/components/mobile-capture-actions";
import { ReceiptPhotoEditor } from "@/components/receipt-photo-editor";
import { Button } from "@/components/ui/button";
import type { ReceiptUploadChannel } from "../lib/receipt-storage";

type UploadedReceipt = {
  storageKey: string;
  channel: ReceiptUploadChannel;
  fileName: string;
};

type ReceiptCaptureProps = {
  vehicleId: string;
  apiBase: string;
  disabled?: boolean;
  minimal?: boolean;
  onUploaded: (upload: UploadedReceipt | null) => void;
  onError: (message: string) => void;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = new Set(ACCEPT.split(","));

export function ReceiptCapture({ vehicleId, apiBase, disabled, minimal = false, onUploaded, onError }: ReceiptCaptureProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preparedFile, setPreparedFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<UploadedReceipt | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [isReviewingPhoto, setIsReviewingPhoto] = useState(false);

  const previewUrl = useMemo(() => {
    if (!preparedFile || !preparedFile.type.startsWith("image/")) return undefined;
    return URL.createObjectURL(preparedFile);
  }, [preparedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const uploadFile = async (file: File) => {
    setPreparedFile(file);
    setIsReviewingPhoto(false);
    setIsUploading(true);
    setUploadFailed(false);
    onError("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/receipts/upload`, {
        method: "POST",
        body: formData,
      });

      const body = (await response.json()) as UploadedReceipt & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Upload failed");

      const next: UploadedReceipt = {
        storageKey: body.storageKey,
        channel: body.channel,
        fileName: body.fileName,
      };
      setUploaded(next);
      onUploaded(next);
    } catch (error) {
      setUploaded(null);
      setUploadFailed(true);
      onUploaded(null);
      onError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreparedFile(null);
    setUploaded(null);
    setUploadFailed(false);
    setIsReviewingPhoto(false);
    onUploaded(null);
  };

  const handlePick = (file: File) => {
    if (file.size === 0) {
      onError("This file is empty. Take another photo or choose a different file.");
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      onError("This file is over the 10 MB limit. Crop it, lower the camera resolution, or choose a smaller file.");
      return;
    }
    if (!ALLOWED_RECEIPT_TYPES.has(file.type)) {
      onError("Unsupported file type. Use JPEG, PNG, WebP, HEIC, or PDF.");
      return;
    }

    setSelectedFile(file);
    setPreparedFile(null);
    setUploaded(null);
    setUploadFailed(false);
    onUploaded(null);
    onError("");

    if (file.type.startsWith("image/")) {
      setIsReviewingPhoto(true);
      return;
    }

    void uploadFile(file);
  };

  return (
    <div className="space-y-4">
      <div className="md:hidden">
        <MobileCaptureActions
          accept={ACCEPT}
          disabled={disabled}
          busy={isUploading}
          onFile={handlePick}
        />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {minimal ? "Photo or PDF" : "JPEG, PNG, WebP, HEIC, or PDF · max 10 MB"}
        </p>
      </div>
      <div className="hidden md:block">
        <FileDropzone
          label={minimal ? "Drop a receipt" : "Photo or PDF receipt"}
          hint={minimal ? "Photo or PDF" : "JPEG, PNG, WebP, HEIC, or PDF · max 10 MB"}
          accept={ACCEPT}
          disabled={disabled}
          busy={isUploading}
          onFile={handlePick}
        />
      </div>

      {selectedFile && isReviewingPhoto ? (
        <ReceiptPhotoEditor
          file={selectedFile}
          disabled={disabled || isUploading}
          onUseEdited={(file) => void uploadFile(file)}
          onUseOriginal={() => void uploadFile(selectedFile)}
          onCancel={clearFile}
          onError={onError}
        />
      ) : null}

      {selectedFile && !isReviewingPhoto ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          {uploaded && previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="mb-3 max-h-48 w-auto rounded-md border border-border object-contain"
            />
          ) : (
            <p className="break-all text-sm font-medium">{preparedFile?.name ?? selectedFile.name}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground" role="status" aria-live="polite">
            {uploaded
              ? minimal
                ? "Ready to hand off"
                : `Stored · ${uploaded.channel === "photo" ? "photo" : "document"} ingest`
              : isUploading
                ? minimal
                  ? "Uploading…"
                  : "Uploading to evidence storage…"
                : "Waiting to upload…"}
          </p>
          <Button type="button" variant="ghost" size="sm" className="mt-2" disabled={disabled || isUploading} onClick={clearFile}>
            {uploaded ? "Choose another" : "Cancel"}
          </Button>
          {uploadFailed && preparedFile ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-2 mt-2"
              disabled={disabled || isUploading}
              onClick={() => void uploadFile(preparedFile)}
            >
              Retry upload
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export type { UploadedReceipt };
