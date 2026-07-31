export type DogfoodFixtureId = "karan-tlx" | "ayush-elantra";

export type DogfoodFixtureProfile = {
  id: DogfoodFixtureId;
  label: string;
  description: string;
  vehicle: { vin: string; year: number; make: string; model: string };
  carfaxUrl: string;
  rmvUrl: string;
  rmvDemoUrl?: string;
  oemScheduleUrl: string;
};

/** Static dogfood profiles served from /dogfood/{id}/ */
export const DOGFOOD_FIXTURE_PROFILES: DogfoodFixtureProfile[] = [
  {
    id: "karan-tlx",
    label: "2021 Acura TLX Technology SH-AWD",
    description: "~59k mi",
    vehicle: { vin: "19UUB6F47MA008400", year: 2021, make: "Acura", model: "TLX" },
    carfaxUrl: "/dogfood/karan-tlx/carfax-history.v1.json",
    rmvUrl: "/dogfood/karan-tlx/rmv-records.v1.json",
    rmvDemoUrl: "/dogfood/karan-tlx/rmv-records-demo.v1.json",
    oemScheduleUrl: "/dogfood/karan-tlx/oem-schedule.v1.json",
  },
  {
    id: "ayush-elantra",
    label: "2022 Hyundai Elantra SEL",
    description: "~34k mi",
    vehicle: { vin: "KMHLS4AG3NU293303", year: 2022, make: "Hyundai", model: "Elantra" },
    carfaxUrl: "/dogfood/ayush-elantra/carfax-history.v1.json",
    rmvUrl: "/dogfood/ayush-elantra/rmv-records.v1.json",
    rmvDemoUrl: "/dogfood/ayush-elantra/rmv-records-demo.v1.json",
    oemScheduleUrl: "/dogfood/ayush-elantra/oem-schedule.v1.json",
  },
];

export const DEFAULT_DOGFOOD_FIXTURE_ID: DogfoodFixtureId = "karan-tlx";

export const getDogfoodFixtureProfile = (id: DogfoodFixtureId): DogfoodFixtureProfile =>
  DOGFOOD_FIXTURE_PROFILES.find((profile) => profile.id === id) ?? DOGFOOD_FIXTURE_PROFILES[0];

type VehicleIdentity = { vin?: string | null; year: number; make: string; model: string };

const normalize = (value: string): string => value.trim().toLowerCase();

export const isDogfoodFixtureCompatible = (
  profile: DogfoodFixtureProfile,
  vehicle: VehicleIdentity,
): boolean => {
  const vin = vehicle.vin?.trim().toUpperCase();
  if (vin && vin !== "UNKNOWN-VIN" && !vin.startsWith("DEMO-")) {
    return vin === profile.vehicle.vin;
  }
  return vehicle.year === profile.vehicle.year
    && normalize(vehicle.make) === normalize(profile.vehicle.make)
    && normalize(vehicle.model) === normalize(profile.vehicle.model);
};

export const getDogfoodFixtureForVehicle = (vehicle: VehicleIdentity): DogfoodFixtureProfile | null =>
  DOGFOOD_FIXTURE_PROFILES.find((profile) => isDogfoodFixtureCompatible(profile, vehicle)) ?? null;

export const fetchDogfoodJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load dogfood fixture (${response.status}).`);
  }
  return (await response.json()) as T;
};
