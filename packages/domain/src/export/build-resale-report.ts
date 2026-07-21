import type {
  EvidenceVaultEntry,
  QuoteAnalysisEntry,
  ServiceTimelineEntry,
  VehicleProjectionState,
} from "../projections/types.js";

export type ResaleReportVehicle = {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  currentMileage: number;
};

export type VehicleOSResaleReportV1 = {
  version: "1";
  kind: "VehicleOSResaleReport.v1";
  source: "vehicleos-owners-app";
  exportedAt: string;
  vehicle: ResaleReportVehicle;
  summary: {
    serviceCount: number;
    evidenceCount: number;
    earliestServiceDate?: string;
    latestServiceDate?: string;
    lowestRecordedMileage?: number;
    highestRecordedMileage?: number;
  };
  timeline: ServiceTimelineEntry[];
  evidenceVault: EvidenceVaultEntry[];
  quoteAnalyses: QuoteAnalysisEntry[];
};

export type BuildResaleReportInput = {
  vehicle: ResaleReportVehicle;
  state: VehicleProjectionState;
  exportedAt?: string;
};

export const buildResaleReport = (input: BuildResaleReportInput): VehicleOSResaleReportV1 => {
  const { vehicle, state } = input;
  const exportedAt = input.exportedAt ?? new Date().toISOString();
  const sortedTimeline = [...state.timeline].sort((left, right) =>
    left.serviceDate.localeCompare(right.serviceDate),
  );
  const mileages = sortedTimeline.map((entry) => entry.mileage);

  return {
    version: "1",
    kind: "VehicleOSResaleReport.v1",
    source: "vehicleos-owners-app",
    exportedAt,
    vehicle,
    summary: {
      serviceCount: sortedTimeline.length,
      evidenceCount: state.evidenceVault.length,
      earliestServiceDate: sortedTimeline[0]?.serviceDate,
      latestServiceDate: sortedTimeline.at(-1)?.serviceDate,
      lowestRecordedMileage: mileages.length > 0 ? Math.min(...mileages) : undefined,
      highestRecordedMileage: mileages.length > 0 ? Math.max(...mileages) : undefined,
    },
    timeline: sortedTimeline,
    evidenceVault: state.evidenceVault,
    quoteAnalyses: state.quoteAnalyses,
  };
};
