"use client";

import { useEffect, useState } from "react";

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
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/manuals/upload`, {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as { storageKey?: string; fileName?: string; error?: string };
      if (!response.ok || !body.storageKey) throw new Error(body.error ?? "Upload failed");
      setStorageKey(body.storageKey);
      setFileName(body.fileName ?? file.name);
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
    <div className="manual-panel">
      <p className="muted">
        Upload your OEM manual PDF, review stub-extracted intervals, and feed the Vehicle Knowledge Base.
      </p>

      <label className="receipt-dropzone">
        <span className="receipt-dropzone-label">
          {isUploading ? "Uploading…" : "OEM manual PDF"}
        </span>
        <span className="receipt-dropzone-hint">Maintenance schedule or owner manual · PDF · max 10 MB</span>
        <input
          type="file"
          accept="application/pdf"
          disabled={disabled || isUploading || isConfirming}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadManual(file);
          }}
        />
      </label>

      {fileName ? <p className="receipt-file-name">Stored · {fileName}</p> : null}
      {extractionNote ? <p className="muted">{extractionNote}</p> : null}

      <label>
        Manual title
        <input
          value={manualTitle}
          disabled={disabled || isConfirming}
          onChange={(event) => setManualTitle(event.target.value)}
        />
      </label>

      {isPreviewing ? <p className="muted">Loading suggested schedule rows…</p> : null}

      {rows.length > 0 ? (
        <div className="manual-schedule-table">
          {rows.map((row, index) => (
            <div key={`${row.serviceName}-${index}`} className="manual-schedule-row">
              <label>
                Service
                <input
                  value={row.serviceName}
                  disabled={disabled || isConfirming}
                  onChange={(event) => updateRow(index, { serviceName: event.target.value })}
                />
              </label>
              <label>
                Miles
                <input
                  type="number"
                  value={row.intervalMiles ?? ""}
                  disabled={disabled || isConfirming}
                  onChange={(event) =>
                    updateRow(index, {
                      intervalMiles: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                />
              </label>
              <label>
                Months
                <input
                  type="number"
                  value={row.intervalMonths ?? ""}
                  disabled={disabled || isConfirming}
                  onChange={(event) =>
                    updateRow(index, {
                      intervalMonths: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                />
              </label>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        disabled={disabled || isConfirming || isUploading || !storageKey}
        onClick={() => void confirmSchedule()}
      >
        {isConfirming ? "Saving knowledge base…" : "Confirm schedule → feed rules engine"}
      </button>
    </div>
  );
}
