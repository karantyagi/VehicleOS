import type { FastifyInstance } from "fastify";
import {
  analyzeQuote,
  createVehicle,
  decideOnTask,
  exportResaleReport,
  getEvidenceAccessUrl,
  getVehicle,
  getVehicleState,
  listVehicles,
  submitReceipt,
  type ApiServices,
  type ExportHandlerResponse,
} from "@vehicleos/server";
import { authFromRequest } from "../auth-context.js";

export const registerGoldenPathRoutes = (app: FastifyInstance, services: ApiServices): void => {
  app.get("/api/vehicles", async (request, reply) => {
    const result = await listVehicles(services, authFromRequest(request));
    return reply.code(result.status).send(result.body);
  });

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

  app.post<{ Params: { vehicleId: string } }>(
    "/api/vehicles/:vehicleId/quotes/analyze",
    async (request, reply) => {
      const result = await analyzeQuote(
        services,
        request.params.vehicleId,
        request.body as Parameters<typeof analyzeQuote>[2],
        authFromRequest(request),
      );
      return reply.code(result.status).send(result.body);
    },
  );

  app.get<{ Params: { vehicleId: string; documentId: string } }>(
    "/api/vehicles/:vehicleId/evidence/:documentId/url",
    async (request, reply) => {
      const result = await getEvidenceAccessUrl(
        services,
        request.params.vehicleId,
        request.params.documentId,
        authFromRequest(request),
      );
      return reply.code(result.status).send(result.body);
    },
  );

  app.get<{ Params: { vehicleId: string }; Querystring: { format?: string } }>(
    "/api/vehicles/:vehicleId/export",
    async (request, reply) => {
      const format = request.query.format === "markdown" ? "markdown" : "json";
      const result = await exportResaleReport(
        services,
        request.params.vehicleId,
        format,
        authFromRequest(request),
      );

      if ("headers" in result) {
        const exportResult = result as ExportHandlerResponse;
        return reply
          .code(exportResult.status)
          .headers(exportResult.headers)
          .send(exportResult.body);
      }

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
