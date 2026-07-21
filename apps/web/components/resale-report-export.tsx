"use client";

type ResaleReportExportProps = {
  vehicleId: string;
  apiBase: string;
  disabled?: boolean;
  serviceCount: number;
  evidenceCount: number;
  onError?: (message: string) => void;
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const filenameFromDisposition = (header: string | null, fallback: string): string => {
  if (!header) return fallback;
  const match = header.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
};

export function ResaleReportExport({
  vehicleId,
  apiBase,
  disabled = false,
  serviceCount,
  evidenceCount,
  onError,
}: ResaleReportExportProps) {
  const downloadExport = async (format: "json" | "markdown") => {
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/export?format=${format}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        onError?.(body?.error ?? "Export failed.");
        return;
      }

      const blob = await response.blob();
      const fallback =
        format === "markdown" ? "vehicleos-resale-report.md" : "vehicleos-resale-report.json";
      const filename = filenameFromDisposition(response.headers.get("Content-Disposition"), fallback);
      downloadBlob(blob, filename);
    } catch {
      onError?.("Export failed.");
    }
  };

  const hasData = serviceCount > 0 || evidenceCount > 0;

  return (
    <div className="export-actions">
      <p className="muted">
        Download your maintenance timeline and evidence vault as a structured package for resale or
        records.
      </p>
      <div className="actions">
        <button
          type="button"
          disabled={disabled || !hasData}
          onClick={() => void downloadExport("json")}
        >
          Download JSON package
        </button>
        <button
          type="button"
          disabled={disabled || !hasData}
          onClick={() => void downloadExport("markdown")}
        >
          Download markdown report
        </button>
      </div>
      {!hasData ? <p className="muted">Record a service or upload evidence to export.</p> : null}
    </div>
  );
}
