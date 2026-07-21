"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file ?? null);
    setUploaded(null);
    onUploaded(null);

    if (!file) return;
    await uploadFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploaded(null);
    onUploaded(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="receipt-capture">
      <label className="receipt-dropzone">
        <span className="receipt-dropzone-label">
          {isUploading ? "Uploading…" : "Photo or PDF receipt"}
        </span>
        <span className="receipt-dropzone-hint">JPEG, PNG, WebP, HEIC, or PDF · max 10 MB</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          disabled={disabled || isUploading}
          onChange={(event) => void handleFileChange(event)}
        />
      </label>

      {selectedFile ? (
        <div className="receipt-file-meta">
      {uploaded?.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={uploaded.previewUrl} alt="Receipt preview" className="receipt-preview" />
          ) : selectedFile ? (
            <p className="receipt-file-name">{selectedFile.name}</p>
          ) : null}
          <p className="muted">
            {uploaded
              ? `Stored · ${uploaded.channel === "photo" ? "photo" : "document"} ingest`
              : isUploading
                ? "Uploading to evidence storage…"
                : "Waiting to upload…"}
          </p>
          <button type="button" className="link-button" disabled={disabled || isUploading} onClick={clearFile}>
            Remove file
          </button>
        </div>
      ) : null}
    </div>
  );
}

export type { UploadedReceipt };
