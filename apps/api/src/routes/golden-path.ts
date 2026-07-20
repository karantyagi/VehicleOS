import type { FastifyInstance } from "fastify";
import type { ApiServices } from "../services/index.js";

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

export const registerGoldenPathRoutes = (app: FastifyInstance, services: ApiServices): void => {
  app.post<{ Body: VehicleBody }>("/api/vehicles", async (request, reply) => {
    const body = request.body ?? {};
    const vehicle = await services.vehicles.create({
      vin: body.vin ?? "DEMO-VIN-001",
      year: body.year ?? 2019,
      make: body.make ?? "Honda",
      model: body.model ?? "Civic",
      trim: body.trim,
      currentMileage: body.currentMileage ?? 41_800,
    });

    return reply.code(201).send({ vehicle });
  });

  app.get<{ Params: { vehicleId: string } }>("/api/vehicles/:vehicleId", async (request, reply) => {
    const vehicle = await services.vehicles.findById(request.params.vehicleId);
    if (!vehicle) return reply.code(404).send({ error: "Vehicle not found" });
    return { vehicle };
  });

  app.get<{ Params: { vehicleId: string } }>(
    "/api/vehicles/:vehicleId/state",
    async (request, reply) => {
      const vehicle = await services.vehicles.findById(request.params.vehicleId);
      if (!vehicle) return reply.code(404).send({ error: "Vehicle not found" });

      const snapshot = await services.goldenPath.getVehicleState(request.params.vehicleId);
      return {
        vehicle,
        timeline: snapshot.state.timeline,
        nowQueue: snapshot.state.nowQueue,
        currentMileage: snapshot.state.currentMileage,
        eventCount: snapshot.events.length,
      };
    },
  );

  app.post<{ Params: { vehicleId: string }; Body: ReceiptBody }>(
    "/api/vehicles/:vehicleId/receipts",
    async (request, reply) => {
      const vehicle = await services.vehicles.findById(request.params.vehicleId);
      if (!vehicle) return reply.code(404).send({ error: "Vehicle not found" });

      const body = request.body;
      const storageKey = body.storageKey ?? `receipts/${request.params.vehicleId}/${Date.now()}.pdf`;

      const { documentId, correlationId } = await services.goldenPath.ingestReceipt({
        vehicleId: request.params.vehicleId,
        storageKey,
      });

      await services.goldenPath.completeExtraction({
        vehicleId: request.params.vehicleId,
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
        vehicleId: request.params.vehicleId,
        shop: body.shop,
        serviceDate: body.serviceDate,
        mileage: body.mileage,
        lineItems: body.lineItems,
        total: body.total,
        evidenceIds: [documentId],
        documentId,
        correlationId,
      });

      return reply.code(201).send({
        documentId,
        recommendation: result.recommendation,
        task: result.task,
        timeline: result.state.timeline,
        nowQueue: result.state.nowQueue,
      });
    },
  );

  app.post<{ Params: { taskId: string }; Body: TaskDecisionBody }>(
    "/api/tasks/:taskId/decide",
    async (request, reply) => {
      const { vehicleId, decision } = request.body;
      if (!vehicleId || !decision) {
        return reply.code(400).send({ error: "vehicleId and decision are required" });
      }

      const snapshot = await services.goldenPath.decideOnTask({
        vehicleId,
        taskId: request.params.taskId,
        decision,
      });

      return {
        taskId: request.params.taskId,
        decision,
        nowQueue: snapshot.state.nowQueue,
      };
    },
  );
};
