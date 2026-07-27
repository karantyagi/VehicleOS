"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getApiBase } from "@/lib/api-base";
import {
  clearStoredActiveVehicleId,
  readStoredActiveVehicleId,
  resolveActiveVehicleId,
  writeStoredActiveVehicleId,
} from "@/lib/garage/active-vehicle-storage";
import type { GarageEntitlements, GarageVehicleSummary, ListVehiclesResponse } from "@/lib/garage/types";

type GarageSwitchLock = {
  locked: boolean;
  reason: string | null;
};

type GarageContextValue = {
  userId: string | null;
  vehicles: GarageVehicleSummary[];
  garage: GarageEntitlements | null;
  activeVehicleId: string | null;
  activeVehicle: GarageVehicleSummary | null;
  isLoading: boolean;
  isAddingVehicle: boolean;
  switchLock: GarageSwitchLock;
  refreshGarage: () => Promise<void>;
  switchVehicle: (vehicleId: string) => { ok: true } | { ok: false; reason: string };
  startAddVehicle: () => { ok: true } | { ok: false; reason: string };
  cancelAddVehicle: () => void;
  completeAddVehicle: (vehicle: GarageVehicleSummary) => void;
  setSwitchLock: (lock: GarageSwitchLock) => void;
};

const defaultSwitchLock: GarageSwitchLock = { locked: false, reason: null };

const GarageContext = createContext<GarageContextValue | null>(null);

type GarageProviderProps = {
  userId: string | null;
  children: ReactNode;
};

export function GarageProvider({ userId, children }: GarageProviderProps) {
  const apiBase = getApiBase();
  const [vehicles, setVehicles] = useState<GarageVehicleSummary[]>([]);
  const [garage, setGarage] = useState<GarageEntitlements | null>(null);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [switchLock, setSwitchLockState] = useState<GarageSwitchLock>(defaultSwitchLock);

  const refreshGarage = useCallback(async () => {
    if (!userId) {
      setVehicles([]);
      setGarage(null);
      setActiveVehicleId(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/vehicles`);
      if (!response.ok) throw new Error("list failed");
      const body = (await response.json()) as ListVehiclesResponse;
      setVehicles(body.vehicles);
      setGarage(body.garage);
      setActiveVehicleId((current) =>
        resolveActiveVehicleId(body.vehicles, userId, current ?? readStoredActiveVehicleId(userId)),
      );
    } catch {
      setVehicles([]);
      setGarage(null);
      setActiveVehicleId(null);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, userId]);

  useEffect(() => {
    void refreshGarage();
  }, [refreshGarage]);

  const activeVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === activeVehicleId) ?? null,
    [vehicles, activeVehicleId],
  );

  const switchVehicle = useCallback(
    (vehicleId: string): { ok: true } | { ok: false; reason: string } => {
      if (switchLock.locked) {
        return { ok: false, reason: switchLock.reason ?? "Finish the current action before switching vehicles." };
      }
      if (!vehicles.some((vehicle) => vehicle.id === vehicleId)) {
        return { ok: false, reason: "That vehicle is not on your account." };
      }
      if (userId) writeStoredActiveVehicleId(userId, vehicleId);
      setActiveVehicleId(vehicleId);
      setIsAddingVehicle(false);
      return { ok: true };
    },
    [switchLock, userId, vehicles],
  );

  const startAddVehicle = useCallback((): { ok: true } | { ok: false; reason: string } => {
    if (switchLock.locked) {
      return { ok: false, reason: switchLock.reason ?? "Finish the current action before adding a car." };
    }
    if (!garage?.canAddVehicle) {
      return {
        ok: false,
        reason: garage?.upgradeMessage ?? "Vehicle limit reached — Pro/Premium for more vehicles ships with v1.",
      };
    }
    setIsAddingVehicle(true);
    return { ok: true };
  }, [garage, switchLock]);

  const cancelAddVehicle = useCallback(() => {
    setIsAddingVehicle(false);
  }, []);

  const completeAddVehicle = useCallback(
    (vehicle: GarageVehicleSummary) => {
      setVehicles((current) => {
        const without = current.filter((entry) => entry.id !== vehicle.id);
        return [...without, vehicle];
      });
      if (userId) writeStoredActiveVehicleId(userId, vehicle.id);
      setActiveVehicleId(vehicle.id);
      setIsAddingVehicle(false);
      void refreshGarage();
    },
    [refreshGarage, userId],
  );

  const setSwitchLock = useCallback((lock: GarageSwitchLock) => {
    setSwitchLockState(lock);
  }, []);

  useEffect(() => {
    if (!userId || !activeVehicleId) return;
    writeStoredActiveVehicleId(userId, activeVehicleId);
  }, [activeVehicleId, userId]);

  useEffect(() => {
    if (userId && vehicles.length === 0 && !isLoading) {
      clearStoredActiveVehicleId(userId);
    }
  }, [isLoading, userId, vehicles.length]);

  const value = useMemo<GarageContextValue>(
    () => ({
      userId,
      vehicles,
      garage,
      activeVehicleId,
      activeVehicle,
      isLoading,
      isAddingVehicle,
      switchLock,
      refreshGarage,
      switchVehicle,
      startAddVehicle,
      cancelAddVehicle,
      completeAddVehicle,
      setSwitchLock,
    }),
    [
      userId,
      vehicles,
      garage,
      activeVehicleId,
      activeVehicle,
      isLoading,
      isAddingVehicle,
      switchLock,
      refreshGarage,
      switchVehicle,
      startAddVehicle,
      cancelAddVehicle,
      completeAddVehicle,
      setSwitchLock,
    ],
  );

  return <GarageContext.Provider value={value}>{children}</GarageContext.Provider>;
}

export function useGarage(): GarageContextValue {
  const ctx = useContext(GarageContext);
  if (!ctx) throw new Error("useGarage must be used within GarageProvider");
  return ctx;
}

export function useGarageOptional() {
  return useContext(GarageContext);
}
