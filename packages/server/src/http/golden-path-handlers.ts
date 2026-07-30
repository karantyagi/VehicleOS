import { getServiceAliasRegistry } from "../adapters/service-alias-registry.js";
import type { ApiServices } from "../services/index.js";
import {
  classifyCaptureIntent,
  formatIntervalOverlayLabel,
  mergeIntervalOverlayMemory,
  mergeMaintenancePatternMemory,
  mergeReceiptExtractWithHints,
  normalizeOwnerContextMemory,
  parseDeviationRuleEntryId,
  parseIntervalRuleEntryId,
  projectMaintenanceDeviations,
  projectMaintenanceSchedule,
  recordOwnershipFromServiceNote,
  resolveScheduleProjectionContext,
  type MaintenanceDeviationReasonId,
  type IntervalBasis,
  type OwnerContextMemory,
  type TireRotationConditionId,
} from "@vehicleos/domain";
import { assertVehicleCreateAllowed } from "./catalog-handlers.js";
import {
  buildGarageEntitlements,
  vehicleLimitErrorBody,
} from "../entitlements/garage-entitlements.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";
import { recommendationContextFromVehicle } from "./recommendation-context-from-vehicle.js";
import { vehicleStateOptionsFromVehicle } from "./vehicle-state-options-from-vehicle.js";
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
  decision: "schedule" | "approve" | "dismiss";
  maintenancePatternReason?: MaintenanceDeviationReasonId;
  ownerIntervalOverlay?: {
    intervalMiles?: number | null;
    intervalMonths?: number | null;
    basis?: IntervalBasis;
    tireRotationConditions?: TireRotationConditionId[];
    label?: string;
  };
};

const TIRE_ROTATION_CONDITIONS = new Set<TireRotationConditionId>([
  "uneven_tread",
  "pressure_or_tpms",
  "pull_vibration_or_cupping",
  "special_tire_setup",
]);

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

  const snapshot = await services.goldenPath.getVehicleState(
    vehicleId,
    vehicleStateOptionsFromVehicle(owned.vehicle),
  );
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
  const hintText = body.lineItems?.join("\n") ?? null;

  const extractResult = await services.goldenPath.queueReceiptExtract({
    vehicleId,
    storageKey: body.storageKey,
    channel,
    hintText,
    shop: body.shop,
    serviceDate: body.serviceDate,
    mileage: body.mileage,
    lineItems: body.lineItems,
    total: body.total,
  });

  if (extractResult.queued) {
    return jsonResponse(202, {
      documentId: extractResult.documentId,
      queued: true,
      message: "Receipt queued for assistant extraction (ENG-2 worker).",
    });
  }

  const extracted = mergeReceiptExtractWithHints(extractResult.extracted, {
    shop: body.shop,
    serviceDate: body.serviceDate,
    mileage: body.mileage,
    lineItems: body.lineItems,
    total: body.total,
  });

  const result = await services.goldenPath.confirmService({
    vehicleId,
    shop: extracted.shop,
    serviceDate: extracted.serviceDate,
    mileage: extracted.mileage,
    lineItems: extracted.lineItems,
    total: extracted.total,
    evidenceIds: [extractResult.documentId],
    documentId: extractResult.documentId,
    correlationId: extractResult.correlationId,
    source: "receipt",
    ...recommendationContextFromVehicle(owned.vehicle),
  });

  if (!result.conflict) {
    await recordOwnershipFromServiceNote({
      eventStore: services.eventStore,
      input: {
        vehicleId,
        lineItems: extracted.lineItems,
        recordDate: extracted.serviceDate,
        mileage: extracted.mileage,
      },
    });
  }

  const snapshot = await services.goldenPath.getVehicleState(
    vehicleId,
    vehicleStateOptionsFromVehicle(owned.vehicle),
  );
  const view = buildVehicleStateView(snapshot.state, owned.vehicle, snapshot.events);

  if (result.conflict) {
    return jsonResponse(409, {
      conflict: true,
      documentId: extractResult.documentId,
      conflictId: result.conflictId,
      extracted,
      verificationTask: {
        taskId: result.taskId,
        title: view.nowQueue.at(-1)?.title,
        reason: view.nowQueue.at(-1)?.reason,
        verificationCode: view.nowQueue.at(-1)?.verificationCode,
      },
      timeline: view.timeline,
      nowQueue: view.nowQueue,
    });
  }

  return jsonResponse(result.result.skippedDuplicate ? 200 : 201, {
    documentId: extractResult.documentId,
    duplicateSkipped: result.result.skippedDuplicate ?? false,
    extracted,
    extractSource: extractResult.extracted.source,
    recommendation: result.result.recommendation,
    task: result.result.task,
    timeline: view.timeline,
    nowQueue: view.nowQueue,
  });
};

export const previewReceiptExtract = async (
  services: ApiServices,
  vehicleId: string,
  body: Partial<ReceiptBody> & {
    storageKey?: string;
    hintText?: string | null;
    filename?: string | null;
  },
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();
  const owned = await assertVehicleOwner(services, vehicleId, auth.userId);
  if (!owned.ok) return owned.response;

  if (!body.storageKey) {
    return jsonResponse(400, { error: "storageKey is required — upload a receipt photo or PDF first" });
  }

  const channel = body.channel ?? "receipt_upload";
  const extractResult = await services.goldenPath.queueReceiptExtract({
    vehicleId,
    storageKey: body.storageKey,
    channel,
    hintText: body.hintText ?? null,
    shop: body.shop,
    serviceDate: body.serviceDate,
    mileage: body.mileage,
    lineItems: body.lineItems,
    total: body.total,
  });

  if (extractResult.queued) {
    return jsonResponse(202, {
      documentId: extractResult.documentId,
      queued: true,
      message: "Receipt queued for assistant extraction (ENG-2 worker).",
    });
  }

  const extracted = mergeReceiptExtractWithHints(extractResult.extracted, {
    shop: body.shop,
    serviceDate: body.serviceDate,
    mileage: body.mileage,
    lineItems: body.lineItems,
    total: body.total,
  });

  return jsonResponse(200, {
    documentId: extractResult.documentId,
    queued: false,
    extracted,
    extractSource: extractResult.extracted.source,
    confidence: extracted.confidence ?? extractResult.extracted.confidence,
  });
};

export const queueReceiptExtract = async (
  services: ApiServices,
  vehicleId: string,
  body: Partial<ReceiptBody> & {
    storageKey?: string;
    hintText?: string | null;
    filename?: string | null;
  },
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();
  const owned = await assertVehicleOwner(services, vehicleId, auth.userId);
  if (!owned.ok) return owned.response;

  if (!body.storageKey) {
    return jsonResponse(400, { error: "storageKey is required — upload a receipt photo or PDF first" });
  }

  const channel = body.channel ?? "receipt_upload";
  const captureIntent = classifyCaptureIntent({
    filename: body.filename ?? body.storageKey,
    channel,
    hintText: body.hintText ?? null,
  });

  if (captureIntent.route === "ownership") {
    return jsonResponse(409, {
      error: captureIntent.reason,
      captureIntent,
      redirect: "ownership_import",
    });
  }

  if (captureIntent.route === "preferences") {
    return jsonResponse(409, {
      error: captureIntent.reason,
      captureIntent,
      redirect: "owner_preferences",
    });
  }

  const extractResult = await services.goldenPath.queueReceiptExtract({
    vehicleId,
    storageKey: body.storageKey,
    channel,
    hintText: body.hintText ?? null,
    shop: body.shop,
    serviceDate: body.serviceDate,
    mileage: body.mileage,
    lineItems: body.lineItems,
    total: body.total,
  });

  if (extractResult.queued) {
    return jsonResponse(202, {
      documentId: extractResult.documentId,
      queued: true,
      captureIntent,
      message: "Receipt queued for assistant extraction (ENG-2 worker).",
    });
  }

  const extracted = mergeReceiptExtractWithHints(extractResult.extracted, {
    shop: body.shop,
    serviceDate: body.serviceDate,
    mileage: body.mileage,
    lineItems: body.lineItems,
    total: body.total,
  });

  const result = await services.goldenPath.confirmService({
    vehicleId,
    shop: extracted.shop,
    serviceDate: extracted.serviceDate,
    mileage: extracted.mileage,
    lineItems: extracted.lineItems,
    total: extracted.total,
    evidenceIds: [extractResult.documentId],
    documentId: extractResult.documentId,
    correlationId: extractResult.correlationId,
    source: "receipt",
    ...recommendationContextFromVehicle(owned.vehicle),
  });

  if (!result.conflict) {
    await recordOwnershipFromServiceNote({
      eventStore: services.eventStore,
      input: {
        vehicleId,
        lineItems: extracted.lineItems,
        recordDate: extracted.serviceDate,
        mileage: extracted.mileage,
      },
    });
  }

  const snapshot = await services.goldenPath.getVehicleState(
    vehicleId,
    vehicleStateOptionsFromVehicle(owned.vehicle),
  );
  const view = buildVehicleStateView(snapshot.state, owned.vehicle, snapshot.events);

  if (result.conflict) {
    return jsonResponse(409, {
      conflict: true,
      documentId: extractResult.documentId,
      captureIntent,
      extracted,
    });
  }

  return jsonResponse(201, {
    documentId: extractResult.documentId,
    queued: false,
    captureIntent,
    extracted,
    extractSource: extractResult.extracted.source,
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

  const { vehicleId, decision } = body;
  if (!vehicleId || !decision) {
    return jsonResponse(400, { error: "vehicleId and decision are required" });
  }
  if (!["schedule", "approve", "dismiss"].includes(decision)) {
    return jsonResponse(400, { error: "Unsupported task decision" });
  }

  const owned = await assertVehicleOwner(services, vehicleId, auth.userId);
  if (!owned.ok) return owned.response;

  const snapshot = await services.goldenPath.getVehicleState(vehicleId, {
    ...vehicleStateOptionsFromVehicle(owned.vehicle),
  });
  const task = snapshot.state.nowQueue.find((item) => item.taskId === taskId);
  if (!task) {
    return jsonResponse(404, { error: "Task not found" });
  }
  if (decision === "schedule" && task.taskKind === "verification") {
    return jsonResponse(400, { error: "Verification tasks cannot be scheduled" });
  }

  if (
    decision === "approve" &&
    body.maintenancePatternReason &&
    task?.verificationCode === "VERIFY_MAINTENANCE_TIMING"
  ) {
    const entryId = parseDeviationRuleEntryId(task.ruleId);
    if (!entryId) {
      return jsonResponse(400, { error: "Could not resolve maintenance item for this verification." });
    }

    const scheduleContext = resolveScheduleProjectionContext({
      ownedSince: owned.vehicle.ownedSince ?? null,
      drivingStyle: owned.vehicle.drivingStyle ?? null,
      statedMilesPerYear: owned.vehicle.statedMilesPerYear ?? null,
      timeline: snapshot.state.timeline,
    });
    const schedule = projectMaintenanceSchedule({
      knowledgeSchedule: snapshot.state.knowledgeSchedule,
      timeline: snapshot.state.timeline,
      currentMileage: snapshot.state.currentMileage,
      effectiveMilesPerYear: scheduleContext.effectiveMilesPerYear,
      ownedSince: scheduleContext.ownedSince,
      horizonMode: "extended",
      serviceAliasRegistry: getServiceAliasRegistry(),
    });
    const deviation = projectMaintenanceDeviations({
      scheduleRows: schedule.rows,
      ownerContextMemory: owned.vehicle.ownerContextMemory,
    }).find((item) => item.entryId === entryId);

    if (!deviation || (deviation.oemTiming !== "early" && deviation.oemTiming !== "late")) {
      return jsonResponse(400, { error: "No active deviation found for this verification." });
    }

    const nextMemory = mergeMaintenancePatternMemory({
      memory: owned.vehicle.ownerContextMemory,
      entryId,
      timing: deviation.oemTiming,
      reasonId: body.maintenancePatternReason,
    });

    const refreshedVehicle = await services.vehicles.update(vehicleId, auth.userId, {
      ownerContextMemory: nextMemory,
    });
    if (!refreshedVehicle) {
      return jsonResponse(404, { error: "Vehicle not found" });
    }

    await services.goldenPath.decideOnTask({
      vehicleId,
      taskId,
      decision,
    });

    await services.goldenPath.refreshMaintenanceRecommendation({
      vehicleId,
      ownerContextMemory: nextMemory,
      drivingStyle: owned.vehicle.drivingStyle ?? null,
    });

    const refreshed = await services.goldenPath.getVehicleState(vehicleId, {
      ...vehicleStateOptionsFromVehicle(owned.vehicle),
      ownerContextMemory: nextMemory,
    });
    const view = buildVehicleStateView(refreshed.state, refreshedVehicle, refreshed.events);

    return jsonResponse(200, {
      taskId,
      decision,
      nowQueue: view.nowQueue,
      reminders: view.reminders,
      verifications: view.verifications,
      pendingReminderCount: view.pendingReminderCount,
      pendingVerificationCount: view.pendingVerificationCount,
      maintenanceDeviations: view.maintenanceDeviations,
    });
  }

  if (
    decision === "approve" &&
    body.ownerIntervalOverlay &&
    task?.verificationCode === "VERIFY_OWNER_INTERVAL"
  ) {
    const entryId = parseIntervalRuleEntryId(task.ruleId);
    if (!entryId) {
      return jsonResponse(400, { error: "Could not resolve maintenance item for this verification." });
    }

    const isTireRotation =
      task.intervalKind === "tire_rotation" || /rotate tires|tire rotation/i.test(task.title);
    const hasIntervalMiles = Object.prototype.hasOwnProperty.call(
      body.ownerIntervalOverlay,
      "intervalMiles",
    );
    const hasIntervalMonths = Object.prototype.hasOwnProperty.call(
      body.ownerIntervalOverlay,
      "intervalMonths",
    );
    const intervalMiles = hasIntervalMiles
      ? body.ownerIntervalOverlay.intervalMiles ?? null
      : task.suggestedIntervalMiles ?? null;
    const intervalMonths = isTireRotation
      ? null
      : hasIntervalMonths
        ? body.ownerIntervalOverlay.intervalMonths ?? null
        : task.suggestedIntervalMonths ?? null;
    if (intervalMiles === null && intervalMonths === null) {
      return jsonResponse(400, { error: "Choose an interval to confirm." });
    }
    const basis: IntervalBasis = isTireRotation
      ? "mileage"
      : body.ownerIntervalOverlay.basis ??
        (intervalMiles !== null && intervalMonths !== null
          ? "mixed"
          : intervalMiles !== null
            ? "mileage"
            : "time");
    const tireRotationConditions = isTireRotation
      ? [...new Set(body.ownerIntervalOverlay.tireRotationConditions ?? [])].filter((condition) =>
          TIRE_ROTATION_CONDITIONS.has(condition),
        )
      : undefined;

    const label =
      body.ownerIntervalOverlay.label ??
      formatIntervalOverlayLabel({ intervalMiles, intervalMonths });

    const nextMemory = mergeIntervalOverlayMemory({
      memory: owned.vehicle.ownerContextMemory,
      entryId,
      overlay: {
        intervalMiles,
        intervalMonths,
        basis,
        tireRotationConditions:
          tireRotationConditions && tireRotationConditions.length > 0
            ? tireRotationConditions
            : undefined,
        label,
        confirmedAt: new Date().toISOString(),
      },
    });

    const refreshedVehicle = await services.vehicles.update(vehicleId, auth.userId, {
      ownerContextMemory: nextMemory,
    });
    if (!refreshedVehicle) {
      return jsonResponse(404, { error: "Vehicle not found" });
    }

    await services.goldenPath.decideOnTask({
      vehicleId,
      taskId,
      decision,
    });

    await services.goldenPath.refreshMaintenanceRecommendation({
      vehicleId,
      ownerContextMemory: nextMemory,
      drivingStyle: owned.vehicle.drivingStyle ?? null,
    });

    const refreshed = await services.goldenPath.getVehicleState(vehicleId, {
      ...vehicleStateOptionsFromVehicle(owned.vehicle),
      ownerContextMemory: nextMemory,
    });
    const view = buildVehicleStateView(refreshed.state, refreshedVehicle, refreshed.events);

    return jsonResponse(200, {
      taskId,
      decision,
      nowQueue: view.nowQueue,
      reminders: view.reminders,
      verifications: view.verifications,
      pendingReminderCount: view.pendingReminderCount,
      pendingVerificationCount: view.pendingVerificationCount,
      maintenanceDeviations: view.maintenanceDeviations,
    });
  }

  const nextSnapshot = await services.goldenPath.decideOnTask({
    vehicleId,
    taskId,
    decision,
  });

  const view = buildVehicleStateView(nextSnapshot.state, owned.vehicle, nextSnapshot.events);

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
