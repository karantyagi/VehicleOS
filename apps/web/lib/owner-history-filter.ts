import type { OwnerHistoryItem, OwnerHistoryItemKind } from "@vehicleos/domain";

export type OwnerHistoryFilter = "all" | OwnerHistoryItemKind;

export const OWNER_HISTORY_FILTERS: readonly { id: OwnerHistoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "service", label: "Service" },
  { id: "ownership", label: "Ownership" },
];

export const filterOwnerHistoryItems = (
  items: OwnerHistoryItem[],
  filter: OwnerHistoryFilter,
): OwnerHistoryItem[] => (filter === "all" ? items : items.filter((item) => item.kind === filter));
