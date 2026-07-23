"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { VehicleContextSnapshot } from "@/lib/console-types";

type VehicleConsoleContextValue = {
  snapshot: VehicleContextSnapshot | null;
  setSnapshot: (snapshot: VehicleContextSnapshot | null) => void;
};

const VehicleConsoleContext = createContext<VehicleConsoleContextValue | null>(null);

export function VehicleConsoleProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<VehicleContextSnapshot | null>(null);
  const value = useMemo(() => ({ snapshot, setSnapshot }), [snapshot]);
  return <VehicleConsoleContext.Provider value={value}>{children}</VehicleConsoleContext.Provider>;
}

export function useVehicleConsole() {
  const ctx = useContext(VehicleConsoleContext);
  if (!ctx) throw new Error("useVehicleConsole must be used within VehicleConsoleProvider");
  return ctx;
}

export function useVehicleConsoleOptional() {
  return useContext(VehicleConsoleContext);
}
