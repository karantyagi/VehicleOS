import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { GOLDEN_PATH_FLOW } from "@vehicleos/domain";
import {
  getApiServices,
  type BuildServicesOptions,
  type VehicleRepositoryLike,
} from "@vehicleos/server";
import { registerGoldenPathRoutes } from "./routes/golden-path.js";

export type BuildAppOptions = BuildServicesOptions;

export const buildApp = async (options: BuildAppOptions = {}): Promise<FastifyInstance> => {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  const services = getApiServices(options);

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/api/vertical-slice", async () => ({ flow: GOLDEN_PATH_FLOW }));
  registerGoldenPathRoutes(app, services);

  return app;
};

export type { VehicleRepositoryLike };
