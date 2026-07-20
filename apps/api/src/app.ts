import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { GOLDEN_PATH_FLOW, InMemoryEventStore } from "@vehicleos/domain";
import { PostgresEventStore } from "./adapters/postgres-event-store.js";
import { getPool } from "./db/pool.js";
import { InMemoryVehicleRepository } from "./repositories/in-memory-vehicle-repository.js";
import { VehicleRepository } from "./repositories/vehicle-repository.js";
import { createApiServices, type ApiServices } from "./services/index.js";
import { registerGoldenPathRoutes } from "./routes/golden-path.js";

import type { VehicleRepositoryLike } from "./types/repositories.js";

export type BuildAppOptions = {
  eventStore?: ApiServices["eventStore"];
  vehicles?: VehicleRepositoryLike;
};

const shouldUseInMemory = (): boolean =>
  process.env.USE_IN_MEMORY_EVENT_STORE === "true" || !process.env.DATABASE_URL;

export const buildApp = async (options: BuildAppOptions = {}): Promise<FastifyInstance> => {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  const useInMemory = options.eventStore ? false : shouldUseInMemory();
  const eventStore =
    options.eventStore ??
    (useInMemory ? new InMemoryEventStore() : new PostgresEventStore(getPool()));

  const vehicles =
    options.vehicles ??
    (useInMemory ? new InMemoryVehicleRepository() : new VehicleRepository(getPool()));

  const services = createApiServices({ eventStore, vehicles });

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/api/vertical-slice", async () => ({ flow: GOLDEN_PATH_FLOW }));
  registerGoldenPathRoutes(app, services);

  return app;
};
