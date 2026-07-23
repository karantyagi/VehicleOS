"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileDropzone } from "@/components/file-dropzone";
import { MobileCaptureActions } from "@/components/mobile-capture-actions";
import { Button } from "@/components/ui/button";
import type { ReceiptUploadChannel } from "../lib/receipt-storage";

type UploadedReceipt = {
  storageKey: string;
  channel: ReceiptUploadChannel;
  fileName: string;
  previewUrl?: string;
};

type ReceiptCaptureProps = {
  vehicleId: string;
  apiBase: string;
  disabled?: boolean;
  onUploaded: (upload: UploadedReceipt | null) => void;
  onError: (message: string) => void;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

export function ReceiptCapture({ vehicleId, apiBase, disabled, onUploaded, onError }: ReceiptCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<UploadedReceipt | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const previewUrl = useMemo(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) return undefined;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
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

      const localPreview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      const next: UploadedReceipt = {
        storageKey: body.storageKey,
        channel: body.channel,
        fileName: body.fileName,
        previewUrl: localPreview,
      };
      setUploaded(next);
      onUploaded(next);
    } catch (error) {
      setUploaded(null);
      onUploaded(null);
      onError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploaded(null);
    onUploaded(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handlePick = (file: File) => {
    setSelectedFile(file);
    setUploaded(null);
    onUploaded(null);
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
        <p className="mt-2 text-center text-xs text-muted-foreground">JPEG, PNG, WebP, HEIC, or PDF · max 10 MB</p>
      </div>
      <div className="hidden md:block">
        <FileDropzone
          label="Photo or PDF receipt"
          hint="JPEG, PNG, WebP, HEIC, or PDF · max 10 MB"
          accept={ACCEPT}
          disabled={disabled}
          busy={isUploading}
          onFile={handlePick}
        />
      </div>

      {selectedFile ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          {uploaded?.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={uploaded.previewUrl}
              alt="Receipt preview"
              className="mb-3 max-h-48 w-auto rounded-md border border-border object-contain"
            />
          ) : (
            <p className="text-sm font-medium">{selectedFile.name}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {uploaded
              ? `Stored · ${uploaded.channel === "photo" ? "photo" : "document"} ingest`
              : isUploading
                ? "Uploading to evidence storage…"
                : "Waiting to upload…"}
          </p>
          <Button type="button" variant="ghost" size="sm" className="mt-2" disabled={disabled || isUploading} onClick={clearFile}>
            Remove file
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export type { UploadedReceipt };
