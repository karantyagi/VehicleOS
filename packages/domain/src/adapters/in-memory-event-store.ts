import { EVENT_VERSIONS, type CatalogDomainEvent } from "../events/catalog.js";
import type { AppendDomainEventInput, DomainEventEnvelope } from "../events/types.js";
import type { EventStore } from "../ports/event-store.js";

export class InMemoryEventStore implements EventStore {
  private readonly events: CatalogDomainEvent[] = [];

  async append(event: AppendDomainEventInput): Promise<DomainEventEnvelope> {
    const [stored] = await this.appendMany([event]);
    return stored;
  }

  async appendMany(inputs: AppendDomainEventInput[]): Promise<DomainEventEnvelope[]> {
    const stored = inputs.map((event) => this.toStoredEvent(event));
    this.events.push(...(stored as CatalogDomainEvent[]));
    return stored;
  }

  async loadByAggregate(aggregateType: string, aggregateId: string): Promise<CatalogDomainEvent[]> {
    return this.events.filter(
      (event) => event.aggregateType === aggregateType && event.aggregateId === aggregateId,
    );
  }

  async loadAll(): Promise<CatalogDomainEvent[]> {
    return [...this.events];
  }

  private toStoredEvent(event: AppendDomainEventInput): DomainEventEnvelope {
    return {
      ...event,
      id: crypto.randomUUID(),
      eventVersion: event.eventVersion ?? EVENT_VERSIONS[event.eventType as keyof typeof EVENT_VERSIONS] ?? 1,
      createdAt: new Date().toISOString(),
    };
  }
}
