import type { VehicleProjectionState } from "../projections/types.js";

export type ServiceConflictKind = "mileage_regression" | "date_regression";

export type ServiceConflict = {
  kind: ServiceConflictKind;
  message: string;
  verificationCode: "VERIFY_ODOMETER" | "VERIFY_DATE";
  incomingMileage: number;
  incomingServiceDate: string;
  currentMileage: number;
  lastServiceDate?: string;
};

export const detectServiceConflict = (
  state: VehicleProjectionState,
  input: { mileage: number; serviceDate: string },
): ServiceConflict | null => {
  if (state.currentMileage > 0 && input.mileage < state.currentMileage) {
    return {
      kind: "mileage_regression",
      verificationCode: "VERIFY_ODOMETER",
      message: `Receipt shows ${input.mileage.toLocaleString()} mi but your timeline is at ${state.currentMileage.toLocaleString()} mi. Confirm the odometer reading before we record this service.`,
      incomingMileage: input.mileage,
      incomingServiceDate: input.serviceDate,
      currentMileage: state.currentMileage,
      lastServiceDate: state.timeline.at(-1)?.serviceDate,
    };
  }

  const lastServiceDate = state.timeline.at(-1)?.serviceDate;
  if (lastServiceDate && input.serviceDate < lastServiceDate) {
    return {
      kind: "date_regression",
      verificationCode: "VERIFY_DATE",
      message: `Receipt date ${input.serviceDate} is before your last recorded service (${lastServiceDate}). Confirm the service date before we append your timeline.`,
      incomingMileage: input.mileage,
      incomingServiceDate: input.serviceDate,
      currentMileage: state.currentMileage,
      lastServiceDate,
    };
  }

  return null;
};
