export const FREE_GARAGE_VEHICLE_LIMIT = 2;

export type GarageTier = "free" | "team" | "premium";

export type GarageEntitlementsInput = {
  userId: string;
  email?: string | null;
  vehicleCount: number;
};

export type GarageEntitlements = {
  tier: GarageTier;
  vehicleCount: number;
  vehicleLimit: number | null;
  canAddVehicle: boolean;
  upgradeRequired: boolean;
  upgradeMessage: string | null;
};

const parseCsvEnv = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const teamUserIds = () => parseCsvEnv(process.env.VEHICLEOS_TEAM_USER_IDS);
const teamEmails = () => parseCsvEnv(process.env.VEHICLEOS_TEAM_EMAILS).map((email) => email.toLowerCase());
const premiumUserIds = () => parseCsvEnv(process.env.VEHICLEOS_PREMIUM_USER_IDS);
const premiumEmails = () => parseCsvEnv(process.env.VEHICLEOS_PREMIUM_EMAILS).map((email) => email.toLowerCase());

export const resolveGarageTier = (input: { userId: string; email?: string | null }): GarageTier => {
  const email = input.email?.trim().toLowerCase() ?? "";
  if (teamUserIds().includes(input.userId) || (email && teamEmails().includes(email))) {
    return "team";
  }
  if (premiumUserIds().includes(input.userId) || (email && premiumEmails().includes(email))) {
    return "premium";
  }
  return "free";
};

export const buildGarageEntitlements = (input: GarageEntitlementsInput): GarageEntitlements => {
  const tier = resolveGarageTier({ userId: input.userId, email: input.email });
  const vehicleCount = Math.max(0, input.vehicleCount);

  if (tier === "team" || tier === "premium") {
    return {
      tier,
      vehicleCount,
      vehicleLimit: null,
      canAddVehicle: true,
      upgradeRequired: false,
      upgradeMessage: null,
    };
  }

  const atLimit = vehicleCount >= FREE_GARAGE_VEHICLE_LIMIT;
  return {
    tier: "free",
    vehicleCount,
    vehicleLimit: FREE_GARAGE_VEHICLE_LIMIT,
    canAddVehicle: !atLimit,
    upgradeRequired: atLimit,
    upgradeMessage: atLimit
      ? "Free early access includes up to 2 vehicles. Pro/Premium (monthly subscription) for more vehicles ships with v1 — join the waitlist from Settings."
      : null,
  };
};

export type VehicleLimitErrorBody = {
  error: string;
  code: "vehicle_limit_reached";
  garage: GarageEntitlements;
};

export const vehicleLimitErrorBody = (garage: GarageEntitlements): VehicleLimitErrorBody => ({
  error: garage.upgradeMessage ?? "Vehicle limit reached for your plan.",
  code: "vehicle_limit_reached",
  garage,
});
