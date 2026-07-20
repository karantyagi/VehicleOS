import { createGoldenPathService, type GoldenPathService } from "./golden-path-service.js";
import type { EventStore } from "@vehicleos/domain";
import type { VehicleRepositoryLike } from "../types/repositories.js";

export type ApiServices = {
  goldenPath: GoldenPathService;
  vehicles: VehicleRepositoryLike;
  eventStore: EventStore;
};

export const createApiServices = (deps: {
  eventStore: EventStore;
  vehicles: VehicleRepositoryLike;
}): ApiServices => ({
  eventStore: deps.eventStore,
  vehicles: deps.vehicles,
  goldenPath: createGoldenPathService({ eventStore: deps.eventStore }),
});
