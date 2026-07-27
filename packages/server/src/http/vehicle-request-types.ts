export type VehicleRequestOpsPayload = {
  requestId: string;
  createdAt: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  note?: string;
  contactEmail: string;
  source?: string;
  userId?: string;
};
