export type DogfoodFixtureId = "karan-tlx" | "ayush-elantra";

export type DogfoodFixtureProfile = {
  id: DogfoodFixtureId;
  label: string;
  description: string;
  carfaxUrl: string;
  rmvUrl: string;
  oemScheduleUrl: string;
};

/** Static dogfood profiles served from /dogfood/{id}/ */
export const DOGFOOD_FIXTURE_PROFILES: DogfoodFixtureProfile[] = [
  {
    id: "karan-tlx",
    label: "2021 Acura TLX",
    description: "~59k mi",
    carfaxUrl: "/dogfood/karan-tlx/carfax-history.v1.json",
    rmvUrl: "/dogfood/karan-tlx/rmv-records.v1.json",
    oemScheduleUrl: "/dogfood/karan-tlx/oem-schedule.v1.json",
  },
  {
    id: "ayush-elantra",
    label: "2022 Hyundai Elantra SEL",
    description: "~34k mi",
    carfaxUrl: "/dogfood/ayush-elantra/carfax-history.v1.json",
    rmvUrl: "/dogfood/ayush-elantra/rmv-records.v1.json",
    oemScheduleUrl: "/dogfood/ayush-elantra/oem-schedule.v1.json",
  },
];

export const DEFAULT_DOGFOOD_FIXTURE_ID: DogfoodFixtureId = "karan-tlx";

export const getDogfoodFixtureProfile = (id: DogfoodFixtureId): DogfoodFixtureProfile =>
  DOGFOOD_FIXTURE_PROFILES.find((profile) => profile.id === id) ?? DOGFOOD_FIXTURE_PROFILES[0];

export const fetchDogfoodJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load dogfood fixture (${response.status}).`);
  }
  return (await response.json()) as T;
};
