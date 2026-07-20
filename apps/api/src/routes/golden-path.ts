import type { FastifyInstance } from "fastify";
import {
  createVehicle,
  decideOnTask,
  getVehicle,
  getVehicleState,
  submitReceipt,
  type ApiServices,
} from "@vehicleos/server";
import { authFromRequest } from "../auth-context.js";

export const registerGoldenPathRoutes = (app: FastifyInstance, services: ApiServices): void => {
  app.post("/api/vehicles", async (request, reply) => {
    const result = await createVehicle(services, request.body ?? {}, authFromRequest(request));
    return reply.code(result.status).send(result.body);
  });

  app.get<{ Params: { vehicleId: string } }>("/api/vehicles/:vehicleId", async (request, reply) => {
    const result = await getVehicle(services, request.params.vehicleId, authFromRequest(request));
    return reply.code(result.status).send(result.body);
  });

  app.get<{ Params: { vehicleId: string } }>(
    "/api/vehicles/:vehicleId/state",
    async (request, reply) => {
      const result = await getVehicleState(
        services,
        request.params.vehicleId,
        authFromRequest(request),
      );
      return reply.code(result.status).send(result.body);
    },
  );

  app.post<{ Params: { vehicleId: string } }>(
    "/api/vehicles/:vehicleId/receipts",
    async (request, reply) => {
      const result = await submitReceipt(
        services,
        request.params.vehicleId,
        request.body as Parameters<typeof submitReceipt>[2],
        authFromRequest(request),
      );
      return reply.code(result.status).send(result.body);
    },
  );

  app.post<{ Params: { taskId: string } }>("/api/tasks/:taskId/decide", async (request, reply) => {
    const result = await decideOnTask(
      services,
      request.params.taskId,
      request.body as Parameters<typeof decideOnTask>[2],
      authFromRequest(request),
    );
    return reply.code(result.status).send(result.body);
  });
};
