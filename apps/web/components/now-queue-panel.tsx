"use client";

type QueueItem = {
  taskId: string;
  title: string;
  reason: string;
  status: string;
  taskKind?: "recommendation" | "verification";
  ruleId?: string;
};

const classifyItem = (
  item: QueueItem,
): "verification" | "seasonal" | "oem" | "schedule" | "other" => {
  if (item.taskKind === "verification") return "verification";
  if (item.ruleId?.startsWith("seasonal.policy.")) return "seasonal";
  if (item.ruleId?.startsWith("knowledge.policy.")) return "oem";
  if (item.ruleId?.startsWith("schedule.policy.")) return "schedule";
  return "other";
};

const categoryLabel = (category: ReturnType<typeof classifyItem>): string => {
  if (category === "verification") return "Verify";
  if (category === "seasonal") return "Seasonal";
  if (category === "oem") return "OEM schedule";
  if (category === "schedule") return "Maintenance";
  return "Action";
};

const categoryClass = (category: ReturnType<typeof classifyItem>): string => {
  if (category === "verification") return "queue-verification badge-warning";
  if (category === "seasonal") return "queue-seasonal badge-seasonal";
  if (category === "oem") return "queue-oem badge-oem";
  if (category === "schedule") return "queue-schedule";
  return "";
};

type NowQueuePanelProps = {
  items: QueueItem[];
  disabled?: boolean;
  isRefreshing?: boolean;
  onDecide: (taskId: string, decision: "approve" | "dismiss" | "snooze") => void;
  onRefresh?: () => void;
};

export function NowQueuePanel({
  items,
  disabled = false,
  isRefreshing = false,
  onDecide,
  onRefresh,
}: NowQueuePanelProps) {
  const pending = items.filter((item) => item.status === "pending");
  const recent = items.filter((item) => item.status !== "pending");

  return (
    <div className="now-queue-panel">
      <div className="now-queue-toolbar">
        <p className="muted">Due items with plain-English reasons — approve, dismiss, or snooze.</p>
        {onRefresh ? (
          <button type="button" disabled={disabled || isRefreshing} onClick={onRefresh}>
            {isRefreshing ? "Refreshing…" : "Refresh recommendations"}
          </button>
        ) : null}
      </div>

      {pending.length === 0 ? (
        <p className="muted">Nothing needs a decision right now.</p>
      ) : (
        <ul className="queue-list">
          {pending.map((item) => {
            const category = classifyItem(item);
            return (
              <li key={item.taskId} className={categoryClass(category)}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.reason}</p>
                  <span className={`badge ${category === "verification" ? "badge-warning" : category === "seasonal" ? "badge-seasonal" : category === "oem" ? "badge-oem" : ""}`}>
                    {categoryLabel(category)}
                  </span>
                </div>
                <div className="actions">
                  <button type="button" disabled={disabled} onClick={() => onDecide(item.taskId, "approve")}>
                    {item.taskKind === "verification" ? "Mark resolved" : "Approve"}
                  </button>
                  <button type="button" disabled={disabled} onClick={() => onDecide(item.taskId, "dismiss")}>
                    Dismiss
                  </button>
                  {item.taskKind !== "verification" ? (
                    <button type="button" disabled={disabled} onClick={() => onDecide(item.taskId, "snooze")}>
                      Snooze
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {recent.length > 0 ? (
        <details className="now-queue-recent">
          <summary>Recent decisions ({recent.length})</summary>
          <ul className="queue-list queue-list-compact">
            {recent.map((item) => (
              <li key={item.taskId}>
                <strong>{item.title}</strong>
                <span className="badge">{item.status}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
