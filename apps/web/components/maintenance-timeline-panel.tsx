"use client";

type TimelineEntry = {
  serviceId: string;
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
  evidenceIds: string[];
  source?: "receipt" | "voice" | "owner_note" | "dealer";
};

const sourceLabel = (source: TimelineEntry["source"]): string => {
  if (source === "receipt") return "Receipt";
  if (source === "voice") return "Voice note";
  if (source === "dealer") return "Dealer";
  return "Owner note";
};

const sourceClass = (source: TimelineEntry["source"]): string => {
  if (source === "receipt") return "badge-receipt";
  if (source === "voice") return "badge-voice";
  if (source === "dealer") return "badge-dealer";
  return "badge-owner";
};

type MaintenanceTimelinePanelProps = {
  entries: TimelineEntry[];
  disabled?: boolean;
  onOpenEvidence?: (documentId: string) => void;
};

export function MaintenanceTimelinePanel({
  entries,
  disabled = false,
  onOpenEvidence,
}: MaintenanceTimelinePanelProps) {
  if (entries.length === 0) {
    return <p className="muted">No services recorded yet — add a receipt, voice note, or owner entry.</p>;
  }

  return (
    <ul className="timeline-list">
      {entries.map((entry) => (
        <li key={entry.serviceId}>
          <div className="timeline-row-head">
            <strong>{entry.serviceDate}</strong>
            <span className={`badge ${sourceClass(entry.source)}`}>{sourceLabel(entry.source)}</span>
          </div>
          <p className="timeline-meta">
            {entry.mileage.toLocaleString()} mi · {entry.shop}
            {entry.total && entry.total !== "$0.00" ? ` · ${entry.total}` : ""}
          </p>
          <span>{entry.lineItems.join(", ")}</span>
          {entry.evidenceIds.length > 0 && onOpenEvidence ? (
            <div className="timeline-evidence">
              {entry.evidenceIds.map((documentId) => (
                <button
                  key={documentId}
                  type="button"
                  className="link-button"
                  disabled={disabled}
                  onClick={() => onOpenEvidence(documentId)}
                >
                  View evidence
                </button>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
