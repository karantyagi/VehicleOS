const ATTENTION_QUERY_KEY = "attention";
const MAINTENANCE_QUERY_KEY = "maintenance";

export const buildOwnerAttentionDeepLink = (taskId: string): string =>
  `/?${ATTENTION_QUERY_KEY}=${encodeURIComponent(taskId.trim())}`;

export const parseOwnerAttentionDeepLink = (search: string): string | null => {
  const taskId = new URLSearchParams(search).get(ATTENTION_QUERY_KEY)?.trim();
  return taskId || null;
};

export const buildMaintenanceItemDeepLink = (entryId: string): string =>
  `/?${MAINTENANCE_QUERY_KEY}=${encodeURIComponent(entryId.trim())}`;

export const parseMaintenanceItemDeepLink = (search: string): string | null => {
  const entryId = new URLSearchParams(search).get(MAINTENANCE_QUERY_KEY)?.trim();
  return entryId || null;
};
