/**
 * Load Karan TLX dogfood seed — owner profile + CARFAX service history.
 *
 * Local (in-memory): USE_IN_MEMORY_EVENT_STORE=true pnpm dogfood:load-karan-tlx
 * Local (Postgres):  DATABASE_URL=... pnpm dogfood:load-karan-tlx
 * Hosted Supabase:    DOGFOOD_USER_ID=<your-auth-user-uuid> DATABASE_URL=... pnpm dogfood:load-karan-tlx
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { DrivingStyle, OwnerContextMemory, VehicleOsImportService } from "@vehicleos/domain";
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

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf8")) as T;

const main = async (): Promise<void> => {
  const userId = process.env.DOGFOOD_USER_ID?.trim() || DEFAULT_DEV_USER_ID;
  const profilePath = resolve(__dirname, "owner-profile.v1.json");
  const importPath = resolve(
    __dirname,
    "../../../connectors/carfax-connect/examples/tlx-carfax-history.v1.json",
  );

  const profile = readJson<OwnerProfileV1>(profilePath);
  const carfaxImport = readJson<CarfaxImportV1>(importPath);

  if (profile.vin !== carfaxImport.vehicle.vin) {
    throw new Error(`VIN mismatch: profile ${profile.vin} vs import ${carfaxImport.vehicle.vin}`);
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
        timelineRows: timelineCount,
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
