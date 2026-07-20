import { InMemoryEventStore } from "@vehicleos/domain";
import { PostgresEventStore } from "./adapters/postgres-event-store.js";
import { getPool } from "./db/pool.js";
import { InMemoryVehicleRepository } from "./repositories/in-memory-vehicle-repository.js";
import { VehicleRepository } from "./repositories/vehicle-repository.js";
import { createApiServices, type ApiServices } from "./services/index.js";
import type { VehicleRepositoryLike } from "./types/repositories.js";

export type BuildServicesOptions = {
  eventStore?: ApiServices["eventStore"];
  vehicles?: VehicleRepositoryLike;
};

const shouldUseInMemory = (): boolean =>
  process.env.USE_IN_MEMORY_EVENT_STORE === "true" || !process.env.DATABASE_URL;

export const getApiServices = (options: BuildServicesOptions = {}): ApiServices => {
  const useInMemory = options.eventStore ? false : shouldUseInMemory();
  const eventStore =
    options.eventStore ??
    (useInMemory ? new InMemoryEventStore() : new PostgresEventStore(getPool()));

  const vehicles =
    options.vehicles ??
    (useInMemory ? new InMemoryVehicleRepository() : new VehicleRepository(getPool()));

  return createApiServices({ eventStore, vehicles });
};
