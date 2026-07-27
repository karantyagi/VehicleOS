/** User-facing labels — internal route remains `/garage`. */
export const CAR_IDENTITY_GROUP_LABEL = "Owner";

export const CAR_IDENTITY_NAV = [
  {
    id: "car" as const,
    label: "Vehicles",
    href: "/garage?tab=car",
    description: "Year, make, model, mileage, VIN",
  },
  {
    id: "driver" as const,
    label: "Driving profile",
    href: "/garage?tab=driver",
    description: "Home city, driving style, and annual miles driven",
  },
];

export type CarIdentityTab = (typeof CAR_IDENTITY_NAV)[number]["id"];
