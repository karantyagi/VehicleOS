export type AggregateType = "vehicle" | "document" | "service" | "task" | "quote";

export type DomainEventEnvelope<TType extends string = string, TPayload = unknown> = {
  id: string;
  aggregateType: AggregateType;
  aggregateId: string;
  eventType: TType;
  eventVersion: number;
  payload: TPayload;
  causationId?: string;
  correlationId?: string;
  createdAt: string;
};

export type AppendDomainEventInput<TType extends string = string, TPayload = unknown> = Omit<
  DomainEventEnvelope<TType, TPayload>,
  "id" | "createdAt"
>;
