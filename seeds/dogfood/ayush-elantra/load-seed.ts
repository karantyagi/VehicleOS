/**
 * Load Ayush Elantra dogfood seed — owner profile + CARFAX service history + RMV records.
 *
 * Local (in-memory): USE_IN_MEMORY_EVENT_STORE=true pnpm dogfood:load-ayush-elantra
 * Local (Postgres):  DATABASE_URL=... pnpm dogfood:load-ayush-elantra
 * Hosted Supabase:    DOGFOOD_USER_ID=<your-auth-user-uuid> DATABASE_URL=... pnpm dogfood:load-ayush-elantra
 *
 * Optional: DOGFOOD_RMV_DEMO=true loads demo RMV fixture (registration expires 2026-09-15) so Schedule shows renewal.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  DrivingStyle,
  OwnerContextMemory,
  VehicleOsImportService,
  VehicleOsRmvRecord,
} from "@vehicleos/domain";
import { getApiServices } from "@vehicleos/server";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_DEV_USER_ID = "00000000-0000-4000-8000-000000000001";

type OwnerProfileV1 = {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  currentMileage: number;
  ownedSince?: string;
  drivingStyle?: DrivingStyle;
  statedMilesPerYear?: number;
  ownerContextMemory?: OwnerContextMemory;
};

type CarfaxImportV1 = {
  version: "1";
  source: string;
  exportedAt: string;
  vehicle: {
    vin: string;
    year: number;
    make: string;
    model: string;
    trim?: string;
    currentMileage: number;
  };
  services: VehicleOsImportService[];
};

type RmvImportV1 = {
  version: "1";
  source: string;
  exportedAt: string;
  vehicle: {
    vin: string;
    year: number;
    make: string;
    model: string;
    trim?: string;
    currentMileage: number;
  };
  records: VehicleOsRmvRecord[];
};

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf8")) as T;

const main = async (): Promise<void> => {
  const userId = process.env.DOGFOOD_USER_ID?.trim() || DEFAULT_DEV_USER_ID;
  const useDemoRmv = process.env.DOGFOOD_RMV_DEMO === "true";
  const profilePath = resolve(__dirname, "owner-profile.v1.json");
  const importPath = resolve(
    __dirname,
    "../../../connectors/carfax-connect/examples/ayush-elantra-carfax-history.v1.json",
  );
  const rmvPath = resolve(
    __dirname,
    useDemoRmv
      ? "../../../connectors/rmv-connect/examples/ayush-elantra-myrmv-import-demo.v1.json"
      : "../../../connectors/rmv-connect/examples/ayush-elantra-myrmv-import.v1.json",
  );

  const profile = readJson<OwnerProfileV1>(profilePath);
  const carfaxImport = readJson<CarfaxImportV1>(importPath);
  const rmvImport = readJson<RmvImportV1>(rmvPath);

  if (profile.vin !== carfaxImport.vehicle.vin || profile.vin !== rmvImport.vehicle.vin) {
    throw new Error(
      `VIN mismatch: profile ${profile.vin} vs CARFAX ${carfaxImport.vehicle.vin} vs RMV ${rmvImport.vehicle.vin}`,
    );
  }

  const services = getApiServices();
  const existing = (await services.vehicles.listByUserId(userId)).find(
    (vehicle) => vehicle.vin === profile.vin,
  );

  const vehicle = existing
    ? (await services.vehicles.update(existing.id, userId, {
        ...profile,
      })) ?? existing
    : await services.vehicles.create({
        userId,
        ...profile,
      });

  const importResult = await services.goldenPath.importVehicleOsHistory({
    vehicleId: vehicle.id,
    importSource: carfaxImport.source,
    services: carfaxImport.services,
  });

  const rmvResult = await services.goldenPath.importVehicleOsRmvHistory({
    vehicleId: vehicle.id,
    importSource: rmvImport.source,
    records: rmvImport.records,
  });

  if (vehicle.currentMileage < carfaxImport.vehicle.currentMileage) {
    await services.vehicles.update(vehicle.id, userId, {
      currentMileage: carfaxImport.vehicle.currentMileage,
    });
  }

  const refresh = await services.goldenPath.refreshMaintenanceRecommendation({
    vehicleId: vehicle.id,
    ownerContextMemory: profile.ownerContextMemory ?? {},
    drivingStyle: profile.drivingStyle ?? null,
  });

  const timelineCount = refresh.state.timeline.length;
  const ownershipCount = refresh.state.ownershipRecords.length;
  const nowCount = refresh.state.nowQueue.length;

  console.log(
    JSON.stringify(
      {
        status: "loaded",
        userId,
        vehicleId: vehicle.id,
        vin: vehicle.vin,
        mileage: Math.max(profile.currentMileage, carfaxImport.vehicle.currentMileage),
        importedCount: importResult.importedCount,
        skippedCount: importResult.skippedCount,
        rmvImportedCount: rmvResult.importedCount,
        rmvSkippedCount: rmvResult.skippedCount,
        rmvFixture: useDemoRmv ? "demo" : "production",
        timelineRows: timelineCount,
        ownershipRecords: ownershipCount,
        nowQueueItems: nowCount,
        storage: process.env.DATABASE_URL ? "postgres" : "in-memory",
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
