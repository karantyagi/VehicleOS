export const activeVehicleStorageKey = (userId: string): string => `vehicleos:active-vehicle:${userId}`;

export const readStoredActiveVehicleId = (userId: string): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(activeVehicleStorageKey(userId));
};

export const writeStoredActiveVehicleId = (userId: string, vehicleId: string): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(activeVehicleStorageKey(userId), vehicleId);
};

export const clearStoredActiveVehicleId = (userId: string): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(activeVehicleStorageKey(userId));
};

export const resolveActiveVehicleId = (
  vehicles: { id: string }[],
  userId: string,
  preferredId?: string | null,
): string | null => {
  if (vehicles.length === 0) return null;
  const ids = new Set(vehicles.map((vehicle) => vehicle.id));
  const stored = preferredId ?? readStoredActiveVehicleId(userId);
  if (stored && ids.has(stored)) return stored;
  return vehicles[0]?.id ?? null;
};
