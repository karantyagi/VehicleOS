"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileDropzone } from "@/components/file-dropzone";
import { MobileCaptureActions } from "@/components/mobile-capture-actions";
import { ReceiptPhotoEditor } from "@/components/receipt-photo-editor";
import { Button } from "@/components/ui/button";
import {
  ACCEPTED_RECEIPT_TYPES,
  MAX_RECEIPT_BYTES,
  clearFailedReceiptDraft,
  isAcceptedReceiptFile,
  loadFailedReceiptDraft,
  saveFailedReceiptDraft,
} from "@/lib/local-receipt-draft";
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
  initialFile?: File | null;
  onUploaded: (upload: UploadedReceipt | null) => void;
  onError: (message: string) => void;
  onInitialFileStored?: () => void;
  onInitialFileDiscarded?: () => void;
  onPendingChange?: (pending: boolean) => void;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";
const receiptFileError = (file: Pick<File, "size" | "type">) => {
  if (file.size === 0) return "This file is empty. Take another photo or choose a different file.";
  if (file.size > MAX_RECEIPT_BYTES) return "This file is over the 10 MB limit. Crop it, lower the camera resolution, or choose a smaller file.";
  if (!ACCEPTED_RECEIPT_TYPES.has(file.type)) return "Unsupported file type. Use JPEG, PNG, WebP, HEIC, or PDF.";
  return null;
};

export function ReceiptCapture({
  vehicleId,
  apiBase,
  disabled,
  minimal = false,
  initialFile = null,
  onUploaded,
  onError,
  onInitialFileStored,
  onInitialFileDiscarded,
  onPendingChange,
}: ReceiptCaptureProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preparedFile, setPreparedFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<UploadedReceipt | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [isReviewingPhoto, setIsReviewingPhoto] = useState(false);
  const [requiresUploadConfirmation, setRequiresUploadConfirmation] = useState(false);
  const incomingFileRef = useRef<File | null>(null);
  const restoredVehicleIdRef = useRef<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!preparedFile || !preparedFile.type.startsWith("image/")) return undefined;
    return URL.createObjectURL(preparedFile);
  }, [preparedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const uploadFile = useCallback(async (file: File) => {
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
      void clearFailedReceiptDraft(vehicleId).catch(() => undefined);
      if (incomingFileRef.current === file) {
        incomingFileRef.current = null;
        onInitialFileStored?.();
      }
    } catch (error) {
      setUploaded(null);
      setUploadFailed(true);
      onUploaded(null);
      if (incomingFileRef.current !== file) {
        void saveFailedReceiptDraft(vehicleId, file).catch(() => undefined);
      }
      onError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [apiBase, onError, onInitialFileStored, onUploaded, vehicleId]);

  const beginFile = useCallback((file: File, options?: { requireUploadConfirmation?: boolean; restoredFailure?: boolean }) => {
    setSelectedFile(file);
    setPreparedFile(file.type.startsWith("image/") ? null : file);
    setUploaded(null);
    setUploadFailed(options?.restoredFailure === true);
    setRequiresUploadConfirmation(options?.requireUploadConfirmation === true || options?.restoredFailure === true);
    onUploaded(null);
    onError("");

    if (file.type.startsWith("image/")) {
      setIsReviewingPhoto(true);
      return;
    }

    setIsReviewingPhoto(false);
    if (!options?.requireUploadConfirmation && !options?.restoredFailure) {
      void uploadFile(file);
    }
  }, [onError, onUploaded, uploadFile]);

  useEffect(() => {
    if (!initialFile || incomingFileRef.current === initialFile) return;
    const error = receiptFileError(initialFile);
    if (error || !isAcceptedReceiptFile(initialFile)) {
      onError(error ?? "This shared file cannot be added as a receipt.");
      onInitialFileDiscarded?.();
      return;
    }
    incomingFileRef.current = initialFile;
    beginFile(initialFile, { requireUploadConfirmation: true });
  }, [beginFile, initialFile, onError, onInitialFileDiscarded]);

  useEffect(() => {
    if (initialFile || restoredVehicleIdRef.current === vehicleId) return;
    restoredVehicleIdRef.current = vehicleId;
    let cancelled = false;
    void loadFailedReceiptDraft(vehicleId)
      .then((file) => {
        if (!cancelled && file) beginFile(file, { restoredFailure: true });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [beginFile, initialFile, vehicleId]);

  useEffect(() => {
    onPendingChange?.(Boolean(selectedFile));
  }, [onPendingChange, selectedFile]);

  useEffect(() => () => onPendingChange?.(false), [onPendingChange]);

  const clearFile = () => {
    const isIncomingFile = incomingFileRef.current === selectedFile;
    setSelectedFile(null);
    setPreparedFile(null);
    setUploaded(null);
    setUploadFailed(false);
    setIsReviewingPhoto(false);
    setRequiresUploadConfirmation(false);
    onUploaded(null);
    void clearFailedReceiptDraft(vehicleId).catch(() => undefined);
    if (isIncomingFile) {
      incomingFileRef.current = null;
      onInitialFileDiscarded?.();
    }
  };

  const handlePick = (file: File) => {
    const error = receiptFileError(file);
    if (error || !isAcceptedReceiptFile(file)) {
      onError(error ?? "This file cannot be added as a receipt.");
      return;
    }
    beginFile(file);
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
                : uploadFailed
                  ? "Saved on this device. Retry when you are ready."
                  : requiresUploadConfirmation
                    ? "Ready to upload. Nothing has left your phone."
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
          {!uploadFailed && requiresUploadConfirmation && preparedFile ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-2 mt-2"
              disabled={disabled || isUploading}
              onClick={() => void uploadFile(preparedFile)}
            >
              Upload receipt
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export type { UploadedReceipt };
