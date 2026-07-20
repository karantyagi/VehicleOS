import type pg from "pg";
import {
  EVENT_TYPES,
  type AggregateType,
  type CatalogDomainEvent,
  type DomainEventType,
} from "@vehicleos/domain";
import type { AppendDomainEventInput, DomainEventEnvelope } from "@vehicleos/domain";
import type { EventStore } from "@vehicleos/domain";

type DomainEventRow = {
  id: string;
  aggregate_type: AggregateType;
  aggregate_id: string;
  event_type: DomainEventType;
  event_version: number;
  payload_json: Record<string, unknown>;
  causation_id: string | null;
  correlation_id: string | null;
  created_at: Date;
};

const rowToEvent = (row: DomainEventRow): CatalogDomainEvent =>
  ({
    id: row.id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    eventType: row.event_type,
    eventVersion: row.event_version,
    payload: row.payload_json,
    causationId: row.causation_id ?? undefined,
    correlationId: row.correlation_id ?? undefined,
    createdAt: row.created_at.toISOString(),
  }) as CatalogDomainEvent;

export class PostgresEventStore implements EventStore {
  constructor(private readonly pool: pg.Pool) {}

  async append(event: AppendDomainEventInput): Promise<DomainEventEnvelope> {
    const [stored] = await this.appendMany([event]);
    return stored;
  }

  async appendMany(events: AppendDomainEventInput[]): Promise<DomainEventEnvelope[]> {
    if (events.length === 0) return [];

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const stored: DomainEventEnvelope[] = [];

      for (const event of events) {
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const result = await client.query<DomainEventRow>(
          `insert into domain_events (
            id, aggregate_type, aggregate_id, event_type, event_version,
            payload_json, causation_id, correlation_id, created_at
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          returning *`,
          [
            id,
            event.aggregateType,
            event.aggregateId,
            event.eventType,
            event.eventVersion,
            event.payload,
            event.causationId ?? null,
            event.correlationId ?? null,
            createdAt,
          ],
        );

        stored.push(rowToEvent(result.rows[0]));
      }

      await client.query("COMMIT");
      return stored;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async loadByAggregate(aggregateType: string, aggregateId: string): Promise<CatalogDomainEvent[]> {
    const result = await this.pool.query<DomainEventRow>(
      `select * from domain_events
       where aggregate_type = $1 and aggregate_id = $2
       order by created_at asc`,
      [aggregateType, aggregateId],
    );

    return result.rows.map(rowToEvent);
  }

  async loadAll(): Promise<CatalogDomainEvent[]> {
    const result = await this.pool.query<DomainEventRow>(
      `select * from domain_events order by created_at asc`,
    );
    return result.rows.map(rowToEvent);
  }

  async loadForVehicle(vehicleId: string): Promise<CatalogDomainEvent[]> {
    const result = await this.pool.query<DomainEventRow>(
      `select * from domain_events
       where payload_json->>'vehicleId' = $1
       order by created_at asc`,
      [vehicleId],
    );
    return result.rows.map(rowToEvent);
  }
}

export const isKnownEventType = (eventType: string): eventType is DomainEventType =>
  Object.values(EVENT_TYPES).includes(eventType as DomainEventType);
