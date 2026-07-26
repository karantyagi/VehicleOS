import type { Tier2000OemFamily } from "./tier2000-types.js";

const MAKE_TO_FAMILY: Record<string, Tier2000OemFamily> = {
  acura: "acura",
  honda: "honda",
  toyota: "toyota",
  lexus: "lexus",
  hyundai: "hyundai",
  kia: "kia",
  nissan: "nissan",
  mazda: "mazda",
  subaru: "subaru",
  ford: "ford",
  chevrolet: "chevy",
  chevy: "chevy",
  jeep: "jeep",
  volkswagen: "vw",
  vw: "vw",
  tesla: "tesla",
  bmw: "bmw",
  "mercedes-benz": "mercedes",
  mercedes: "mercedes",
  audi: "audi",
  genesis: "genesis",
  volvo: "volvo",
  cadillac: "cadillac",
  lincoln: "lincoln",
  infiniti: "infiniti",
  porsche: "porsche",
  mini: "mini",
  "land rover": "land_rover",
  jaguar: "jaguar",
  "alfa romeo": "alfa_romeo",
  buick: "buick",
  chrysler: "chrysler",
  mitsubishi: "mitsubishi",
};

export const inferOemFamilyFromMake = (make: string): Tier2000OemFamily => {
  const normalized = make.trim().toLowerCase();
  return MAKE_TO_FAMILY[normalized] ?? "ev-generic";
};
