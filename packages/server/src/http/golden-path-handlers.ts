import type { ApiServices } from "../services/index.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";

type ReceiptBody = {
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
  storageKey?: string;
};

type VehicleBody = {
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  currentMileage?: number;
};

type TaskDecisionBody = {
  vehicleId: string;
  decision: "approve" | "dismiss" | "snooze";
};

type AuthContext = {
  userId: string;
};

const unauthorized = (): JsonResponse => jsonResponse(401, { error: "Unauthorized" });

const forbidden = (): JsonResponse => jsonResponse(403, { error: "Forbidden" });

const assertVehicleOwner = async (
  services: ApiServices,
  vehicleId: string,
  userId: string,
): Promise<
  | { ok: true; vehicle: NonNullable<Awaited<ReturnType<ApiServices["vehicles"]["findById"]>>> }
  | { ok: false; response: JsonResponse }
> => {
  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return { ok: false, response: jsonResponse(404, { error: "Vehicle not found" }) };
  if (vehicle.userId !== userId) return { ok: false, response: forbidden() };
  return { ok: true, vehicle };
};

export const createVehicle = async (
  services: ApiServices,
  body: VehicleBody = {},
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicle = await services.vehicles.create({
    userId: auth.userId,
    vin: body.vin ?? "DEMO-VIN-001",
    year: body.year ?? 2019,
    make: body.make ?? "Honda",
    model: body.model ?? "Civic",
    trim: body.trim,
    currentMileage: body.currentMileage ?? 41_800,
  });

  return jsonResponse(201, { vehicle });
};

export const getVehicle = async (
  services: ApiServices,
  vehicleId: string,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();
  const owned = await assertVehicleOwner(services, vehicleId, auth.userId);
  if (!owned.ok) return owned.response;
  return jsonResponse(200, { vehicle: owned.vehicle });
};

export const getVehicleState = async (
  services: ApiServices,
  vehicleId: string,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();
  const owned = await assertVehicleOwner(services, vehicleId, auth.userId);
  if (!owned.ok) return owned.response;

  const snapshot = await services.goldenPath.getVehicleState(vehicleId);
  return jsonResponse(200, {
    vehicle: owned.vehicle,
    timeline: snapshot.state.timeline,
    nowQueue: snapshot.state.nowQueue,
    currentMileage: snapshot.state.currentMileage,
    eventCount: snapshot.events.length,
  });
};

export const submitReceipt = async (
  services: ApiServices,
  vehicleId: string,
  body: ReceiptBody,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();
  const owned = await assertVehicleOwner(services, vehicleId, auth.userId);
  if (!owned.ok) return owned.response;

  const storageKey = body.storageKey ?? `receipts/${vehicleId}/${Date.now()}.pdf`;

  const { documentId, correlationId } = await services.goldenPath.ingestReceipt({
    vehicleId,
    storageKey,
  });

  await services.goldenPath.completeExtraction({
    vehicleId,
    documentId,
    correlationId,
    extracted: {
      shop: body.shop,
      serviceDate: body.serviceDate,
      mileage: body.mileage,
      lineItems: body.lineItems,
      total: body.total,
      confidence: 0.92,
    },
  });

  const result = await services.goldenPath.confirmService({
    vehicleId,
    shop: body.shop,
    serviceDate: body.serviceDate,
    mileage: body.mileage,
    lineItems: body.lineItems,
    total: body.total,
    evidenceIds: [documentId],
    documentId,
    correlationId,
  });

  return jsonResponse(201, {
    documentId,
    recommendation: result.recommendation,
    task: result.task,
    timeline: result.state.timeline,
    nowQueue: result.state.nowQueue,
  });
};

export const decideOnTask = async (
  services: ApiServices,
  taskId: string,
  body: TaskDecisionBody,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const { vehicleId, decision } = body;
  if (!vehicleId || !decision) {
    return jsonResponse(400, { error: "vehicleId and decision are required" });
  }

  const owned = await assertVehicleOwner(services, vehicleId, auth.userId);
  if (!owned.ok) return owned.response;

  const snapshot = await services.goldenPath.decideOnTask({
    vehicleId,
    taskId,
    decision,
  });

  return jsonResponse(200, {
    taskId,
    decision,
    nowQueue: snapshot.state.nowQueue,
  });
};
