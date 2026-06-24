export type DomainEvent = {
  eventType: string;
  aggregateId: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

export const SERVICE_RECORDED = "service.recorded";
