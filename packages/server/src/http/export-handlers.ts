import { buildResaleReport, formatResaleReportMarkdown } from "@vehicleos/domain";
import type { ApiServices } from "../services/index.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";

type AuthContext = {
  userId: string;
};

export type ExportFormat = "json" | "markdown";

export type ExportHandlerResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

const unauthorized = (): JsonResponse => jsonResponse(401, { error: "Unauthorized" });

const forbidden = (): JsonResponse => jsonResponse(403, { error: "Forbidden" });

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildExportFilename = (
  vehicle: { year: number; make: string; model: string },
  exportedAt: string,
  extension: "json" | "md",
): string => {
  const datePart = exportedAt.slice(0, 10);
  const slug = slugify(`${vehicle.year}-${vehicle.make}-${vehicle.model}`) || "vehicle";
  return `vehicleos-resale-${slug}-${datePart}.${extension}`;
};

export const exportResaleReport = async (
  services: ApiServices,
  vehicleId: string,
  format: ExportFormat = "json",
  auth?: AuthContext,
): Promise<JsonResponse | ExportHandlerResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return jsonResponse(404, { error: "Vehicle not found" });
  if (vehicle.userId !== auth.userId) return forbidden();

  const snapshot = await services.goldenPath.getVehicleState(vehicleId);
  const report = buildResaleReport({
    vehicle: {
      id: vehicle.id,
      vin: vehicle.vin,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
      currentMileage: snapshot.state.currentMileage || vehicle.currentMileage,
    },
    state: snapshot.state,
  });

  if (format === "markdown") {
    const body = formatResaleReportMarkdown(report);
    const filename = buildExportFilename(vehicle, report.exportedAt, "md");

    return {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
      body,
    };
  }

  const body = JSON.stringify(report, null, 2);
  const filename = buildExportFilename(vehicle, report.exportedAt, "json");

  return {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
    body,
  };
};
