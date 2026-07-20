import type { AppendDomainEventInput, DomainEventEnvelope } from "../events/types.js";
import type { CatalogDomainEvent } from "../events/catalog.js";

export interface EventStore {
  append(event: AppendDomainEventInput): Promise<DomainEventEnvelope>;
  appendMany(events: AppendDomainEventInput[]): Promise<DomainEventEnvelope[]>;
  loadByAggregate(aggregateType: string, aggregateId: string): Promise<CatalogDomainEvent[]>;
  loadAll(): Promise<CatalogDomainEvent[]>;
}
