import type {
  OwnerContextMemory,
  ServiceBenefitMemory,
} from "./types.js";

export const mergeServiceBenefitMemory = (input: {
  memory?: OwnerContextMemory | null;
  canonicalServiceId: string;
  benefit: ServiceBenefitMemory;
}): OwnerContextMemory => ({
  ...(input.memory ?? {}),
  serviceBenefits: {
    ...(input.memory?.serviceBenefits ?? {}),
    [input.canonicalServiceId]: input.benefit,
  },
});
