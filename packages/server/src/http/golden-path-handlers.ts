import type { ApiServices } from "../services/index.js";
import { normalizeOwnerContextMemory, type OwnerContextMemory } from "@vehicleos/domain";
import { assertVehicleCreateAllowed } from "./catalog-handlers.js";
import {
  buildGarageEntitlements,
  vehicleLimitErrorBody,
} from "../entitlements/garage-entitlements.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";
import { recommendationContextFromVehicle } from "./recommendation-context-from-vehicle.js";
import { buildVehicleStateView } from "./vehicle-state-view.js";

type ReceiptBody = {
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
  storageKey?: string;
  channel?: "receipt_upload" | "photo";
};

type VehicleBody = {
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  currentMileage?: number;
  ownedSince?: string | null;
  drivingStyle?: "economical" | "casual" | "aggressive" | null;
  statedMilesPerYear?: number | null;
  ownerContextMemory?: OwnerContextMemory | null;
};

type TaskDecisionBody = {
  vehicleId: string;
  decision: "approve" | "dismiss" | "snooze";
  snoozeDays?: number;
};

type AuthContext = {
  userId: string;
  email?: string | null;
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

  const allowed = assertVehicleCreateAllowed({
    year: body.year,
    make: body.make,
    model: body.model,
    trim: body.trim,
  });
  if (!allowed.ok) {
    return jsonResponse(allowed.status, allowed.body);
  }

  const currentMileage = body.currentMileage ?? 0;
  if (currentMileage <= 0) {
    return jsonResponse(400, {
      error: "currentMileage must be greater than zero",
      code: "vehicle_incomplete",
    });
  }

  const existingVehicles = await services.vehicles.listByUserId(auth.userId);
  const garage = buildGarageEntitlements({
    userId: auth.userId,
    email: auth.email,
    vehicleCount: existingVehicles.length,
  });
  if (!garage.canAddVehicle) {
    return jsonResponse(403, vehicleLimitErrorBody(garage));
  }

  const vehicle = await services.vehicles.create({
    userId: auth.userId,
    vin: body.vin ?? "DEMO-VIN-001",
    year: body.year!,
    make: body.make!.trim(),
    model: body.model!.trim(),
    trim: body.trim!.trim(),
    currentMileage,
    ownedSince: body.ownedSince ?? null,
    drivingStyle: body.drivingStyle ?? null,
    statedMilesPerYear: body.statedMilesPerYear ?? null,
    ownerContextMemory: normalizeOwnerContextMemory(body.ownerContextMemory),
  });

  const oemPack = await services.goldenPath.hydrateOemKnowledgePack({
    id: vehicle.id,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    currentMileage: vehicle.currentMileage,
  });

  return jsonResponse(201, { vehicle, oemPack, packId: allowed.packId, garage: buildGarageEntitlements({
    userId: auth.userId,
    email: auth.email,
    vehicleCount: existingVehicles.length + 1,
  }) });
};

export const listVehicles = async (
  services: ApiServices,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicles = await services.vehicles.listByUserId(auth.userId);
  const garage = buildGarageEntitlements({
    userId: auth.userId,
    email: auth.email,
    vehicleCount: vehicles.length,
  });
  return jsonResponse(200, { vehicles, garage });
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

export const updateVehicle = async (
  services: ApiServices,
  vehicleId: string,
  body: VehicleBody = {},
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const updated = await services.vehicles.update(vehicleId, auth.userId, {
    vin: body.vin,
    year: body.year,
    make: body.make,
    model: body.model,
    trim: body.trim,
    currentMileage: body.currentMileage,
    ownedSince: body.ownedSince,
    drivingStyle: body.drivingStyle,
    statedMilesPerYear: body.statedMilesPerYear,
    ownerContextMemory:
      body.ownerContextMemory === undefined
        ? undefined
        : normalizeOwnerContextMemory(body.ownerContextMemory),
  });

  if (!updated) return jsonResponse(404, { error: "Vehicle not found" });
  return jsonResponse(200, { vehicle: updated });
};

export const deleteVehicle = async (
  services: ApiServices,
  vehicleId: string,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const deleted = await services.vehicles.delete(vehicleId, auth.userId);
  if (!deleted) return jsonResponse(404, { error: "Vehicle not found" });
  return jsonResponse(200, { deleted: true });
};

export const getVehicleState = async (
  services: ApiServices,
  vehicleId: string,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();
  const owned = await assertVehicleOwner(services, vehicleId, auth.userId);
  if (!owned.ok) return owned.response;

  const snapshot = await services.goldenPath.getVehicleState(vehicleId, {
    vehicleCreatedAt: owned.vehicle.createdAt,
  });
  return jsonResponse(200, {
    vehicle: owned.vehicle,
    ...buildVehicleStateView(snapshot.state, owned.vehicle, snapshot.events),
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

  if (!body.storageKey) {
    return jsonResponse(400, { error: "storageKey is required — upload a receipt photo or PDF first" });
  }

  const channel = body.channel ?? "receipt_upload";

  const { documentId, correlationId } = await services.goldenPath.ingestReceipt({
    vehicleId,
    storageKey: body.storageKey,
    channel,
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
    source: "receipt",
    ...recommendationContextFromVehicle(owned.vehicle),
  });

  if (result.conflict) {
    return jsonResponse(409, {
      conflict: true,
      documentId,
      conflictId: result.conflictId,
      verificationTask: {
        taskId: result.taskId,
        title: result.state.nowQueue.at(-1)?.title,
        reason: result.state.nowQueue.at(-1)?.reason,
        verificationCode: result.state.nowQueue.at(-1)?.verificationCode,
      },
      timeline: buildVehicleStateView(result.state, owned.vehicle).timeline,
      nowQueue: buildVehicleStateView(result.state, owned.vehicle).nowQueue,
    });
  }

  const view = buildVehicleStateView(result.result.state, owned.vehicle);

  return jsonResponse(result.result.skippedDuplicate ? 200 : 201, {
    documentId,
    duplicateSkipped: result.result.skippedDuplicate ?? false,
    recommendation: result.result.recommendation,
    task: result.result.task,
    timeline: view.timeline,
    nowQueue: view.nowQueue,
  });
};

export const decideOnTask = async (
  services: ApiServices,
  taskId: string,
  body: TaskDecisionBody,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const { vehicleId, decision, snoozeDays } = body;
  if (!vehicleId || !decision) {
    return jsonResponse(400, { error: "vehicleId and decision are required" });
  }

  const owned = await assertVehicleOwner(services, vehicleId, auth.userId);
  if (!owned.ok) return owned.response;

  const snapshot = await services.goldenPath.decideOnTask({
    vehicleId,
    taskId,
    decision,
    snoozeDays,
  });

  const view = buildVehicleStateView(snapshot.state, owned.vehicle, snapshot.events);

  return jsonResponse(200, {
    taskId,
    decision,
    nowQueue: view.nowQueue,
    reminders: view.reminders,
    verifications: view.verifications,
    pendingReminderCount: view.pendingReminderCount,
    pendingVerificationCount: view.pendingVerificationCount,
  });
};
