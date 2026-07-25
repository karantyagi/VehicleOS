import { createGoldenPathService, type GoldenPathService } from "./golden-path-service.js";
import type { EventStore, ShopLocationLookupPort } from "@vehicleos/domain";
import type { VehicleRepositoryLike } from "../types/repositories.js";
import { createShopLocationLookupService } from "./shop-location-lookup-service.js";

export type ApiServices = {
  goldenPath: GoldenPathService;
  vehicles: VehicleRepositoryLike;
  eventStore: EventStore;
  shopLocationLookup: ShopLocationLookupPort;
};

export const createApiServices = (deps: {
  eventStore: EventStore;
  vehicles: VehicleRepositoryLike;
  shopLocationLookup?: ShopLocationLookupPort;
}): ApiServices => ({
  eventStore: deps.eventStore,
  vehicles: deps.vehicles,
  goldenPath: createGoldenPathService({ eventStore: deps.eventStore }),
  shopLocationLookup: deps.shopLocationLookup ?? createShopLocationLookupService(),
});
