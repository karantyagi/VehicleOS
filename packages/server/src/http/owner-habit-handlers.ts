import {
  parseOwnerHabitNote,
  recordOwnerHabitProposal,
  validateOwnerHabitProposal,
  type OwnerHabitCaptureChannel,
  type OwnerHabitProposalV1,
} from "@vehicleos/domain";
import type { ApiServices } from "../services/index.js";
import { buildVehicleStateView } from "./vehicle-state-view.js";
import { vehicleStateOptionsFromVehicle } from "./vehicle-state-options-from-vehicle.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";

type AuthContext = { userId: string };

type OwnerHabitBody = {
  text?: string;
  captureChannel?: OwnerHabitCaptureChannel;
  proposal?: OwnerHabitProposalV1;
};

export const submitOwnerHabit = async (
  services: ApiServices,
  vehicleId: string,
  body: OwnerHabitBody,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return jsonResponse(401, { error: "Unauthorized" });
  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return jsonResponse(404, { error: "Vehicle not found" });
  if (vehicle.userId !== auth.userId) return jsonResponse(403, { error: "Forbidden" });

  const proposal = body.proposal ?? parseOwnerHabitNote({
    text: body.text ?? "",
    captureChannel: body.captureChannel === "voice" ? "voice" : "text",
  });
  if (!proposal) {
    return jsonResponse(422, {
      error: 'Could not extract an owner habit. Try: "I add Techron every 3,000 miles."',
    });
  }

  const validationError = validateOwnerHabitProposal(proposal);
  if (validationError) return jsonResponse(422, { error: validationError });

  const result = await recordOwnerHabitProposal({
    eventStore: services.eventStore,
    vehicleId,
    proposal,
  });
  const snapshot = await services.goldenPath.getVehicleState(
    vehicleId,
    vehicleStateOptionsFromVehicle(vehicle),
  );
  const view = buildVehicleStateView(snapshot.state, vehicle, snapshot.events);

  return jsonResponse(result.created ? 201 : 200, {
    proposal,
    taskId: result.taskId,
    created: result.created,
    nowQueue: view.nowQueue,
    verifications: view.verifications,
  });
};
