import { createGoldenPathService, type GoldenPathService } from "./golden-path-service.js";
import type { EventStore, JobPublisher, ShopLocationLookupPort } from "@vehicleos/domain";
import type { VehicleRepositoryLike } from "../types/repositories.js";
import { createShopLocationLookupService } from "./shop-location-lookup-service.js";
import { InMemoryJobPublisher } from "../adapters/in-memory-job-publisher.js";

export type ApiServices = {
  goldenPath: GoldenPathService;
  vehicles: VehicleRepositoryLike;
  eventStore: EventStore;
  shopLocationLookup: ShopLocationLookupPort;
  jobPublisher: JobPublisher;
};

export const createApiServices = (deps: {
  eventStore: EventStore;
  vehicles: VehicleRepositoryLike;
  shopLocationLookup?: ShopLocationLookupPort;
  jobPublisher?: JobPublisher;
}): ApiServices => {
  const jobPublisher = deps.jobPublisher ?? new InMemoryJobPublisher();
  return {
    eventStore: deps.eventStore,
    vehicles: deps.vehicles,
    jobPublisher,
    goldenPath: createGoldenPathService({ eventStore: deps.eventStore, jobPublisher }),
    shopLocationLookup: deps.shopLocationLookup ?? createShopLocationLookupService(),
  };
};
