export type Tier1PackSpec = {
  packId: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  powertrain?: string;
  oemFamily:
    | "toyota"
    | "honda"
    | "hyundai"
    | "kia"
    | "nissan"
    | "mazda"
    | "subaru"
    | "vw"
    | "ford"
    | "chevy"
    | "jeep"
    | "lexus"
    | "acura"
    | "tesla"
    | "ev-generic";
  scheduleKind: "maintenance_minder" | "fixed_interval" | "ev_simplified";
};

/** Tier-1 big-bang catalog — 49 pack keys from oem-knowledge-pack-factory.md */
export const TIER1_PACK_SPECS: Tier1PackSpec[] = [
  { packId: "toyota-camry-2024-le", make: "Toyota", model: "Camry", year: 2024, trim: "LE", oemFamily: "toyota", scheduleKind: "fixed_interval" },
  { packId: "toyota-camry-2024-xse", make: "Toyota", model: "Camry", year: 2024, trim: "XSE", oemFamily: "toyota", scheduleKind: "fixed_interval" },
  { packId: "honda-accord-2024-ex", make: "Honda", model: "Accord", year: 2024, trim: "EX", oemFamily: "honda", scheduleKind: "maintenance_minder" },
  { packId: "honda-civic-2024-sport", make: "Honda", model: "Civic", year: 2024, trim: "Sport", oemFamily: "honda", scheduleKind: "maintenance_minder" },
  { packId: "toyota-corolla-2024-le", make: "Toyota", model: "Corolla", year: 2024, trim: "LE", oemFamily: "toyota", scheduleKind: "fixed_interval" },
  { packId: "hyundai-elantra-2024-se", make: "Hyundai", model: "Elantra", year: 2024, trim: "SE", oemFamily: "hyundai", scheduleKind: "fixed_interval" },
  { packId: "kia-k5-2024-lxs", make: "Kia", model: "K5", year: 2024, trim: "LXS", oemFamily: "kia", scheduleKind: "fixed_interval" },
  { packId: "nissan-altima-2024-sv", make: "Nissan", model: "Altima", year: 2024, trim: "SV", oemFamily: "nissan", scheduleKind: "fixed_interval" },
  { packId: "mazda3-2024-select", make: "Mazda", model: "3", year: 2024, trim: "Select", oemFamily: "mazda", scheduleKind: "fixed_interval" },
  { packId: "subaru-impreza-2024-base", make: "Subaru", model: "Impreza", year: 2024, trim: "Base", oemFamily: "subaru", scheduleKind: "fixed_interval" },
  { packId: "vw-jetta-2024-s", make: "Volkswagen", model: "Jetta", year: 2024, trim: "S", oemFamily: "vw", scheduleKind: "fixed_interval" },
  { packId: "toyota-prius-2024-xle", make: "Toyota", model: "Prius", year: 2024, trim: "XLE", powertrain: "Hybrid", oemFamily: "toyota", scheduleKind: "fixed_interval" },
  { packId: "toyota-rav4-2024-le", make: "Toyota", model: "RAV4", year: 2024, trim: "LE", oemFamily: "toyota", scheduleKind: "fixed_interval" },
  { packId: "toyota-rav4-2024-hybrid-xle", make: "Toyota", model: "RAV4", year: 2024, trim: "XLE", powertrain: "Hybrid", oemFamily: "toyota", scheduleKind: "fixed_interval" },
  { packId: "honda-cr-v-2024-ex", make: "Honda", model: "CR-V", year: 2024, trim: "EX", oemFamily: "honda", scheduleKind: "maintenance_minder" },
  { packId: "mazda-cx5-2024-preferred", make: "Mazda", model: "CX-5", year: 2024, trim: "Preferred", oemFamily: "mazda", scheduleKind: "fixed_interval" },
  { packId: "subaru-forester-2024-premium", make: "Subaru", model: "Forester", year: 2024, trim: "Premium", oemFamily: "subaru", scheduleKind: "fixed_interval" },
  { packId: "hyundai-tucson-2024-se", make: "Hyundai", model: "Tucson", year: 2024, trim: "SE", oemFamily: "hyundai", scheduleKind: "fixed_interval" },
  { packId: "kia-sportage-2024-lx", make: "Kia", model: "Sportage", year: 2024, trim: "LX", oemFamily: "kia", scheduleKind: "fixed_interval" },
  { packId: "nissan-rogue-2024-sv", make: "Nissan", model: "Rogue", year: 2024, trim: "SV", oemFamily: "nissan", scheduleKind: "fixed_interval" },
  { packId: "ford-escape-2024-se", make: "Ford", model: "Escape", year: 2024, trim: "SE", oemFamily: "ford", scheduleKind: "fixed_interval" },
  { packId: "chevy-equinox-2024-lt", make: "Chevrolet", model: "Equinox", year: 2024, trim: "LT", oemFamily: "chevy", scheduleKind: "fixed_interval" },
  { packId: "subaru-crosstrek-2024-premium", make: "Subaru", model: "Crosstrek", year: 2024, trim: "Premium", oemFamily: "subaru", scheduleKind: "fixed_interval" },
  { packId: "honda-hrv-2024-ex", make: "Honda", model: "HR-V", year: 2024, trim: "EX", oemFamily: "honda", scheduleKind: "maintenance_minder" },
  { packId: "toyota-corolla-cross-2024-se", make: "Toyota", model: "Corolla Cross", year: 2024, trim: "SE", oemFamily: "toyota", scheduleKind: "fixed_interval" },
  { packId: "mazda-cx30-2024-select", make: "Mazda", model: "CX-30", year: 2024, trim: "Select", oemFamily: "mazda", scheduleKind: "fixed_interval" },
  { packId: "toyota-highlander-2024-le", make: "Toyota", model: "Highlander", year: 2024, trim: "LE", oemFamily: "toyota", scheduleKind: "fixed_interval" },
  { packId: "honda-pilot-2024-ex-l", make: "Honda", model: "Pilot", year: 2024, trim: "EX-L", oemFamily: "honda", scheduleKind: "maintenance_minder" },
  { packId: "subaru-outback-2024-premium", make: "Subaru", model: "Outback", year: 2024, trim: "Premium", oemFamily: "subaru", scheduleKind: "fixed_interval" },
  { packId: "kia-telluride-2024-lx", make: "Kia", model: "Telluride", year: 2024, trim: "LX", oemFamily: "kia", scheduleKind: "fixed_interval" },
  { packId: "hyundai-santa-fe-2024-se", make: "Hyundai", model: "Santa Fe", year: 2024, trim: "SE", oemFamily: "hyundai", scheduleKind: "fixed_interval" },
  { packId: "ford-explorer-2024-xlt", make: "Ford", model: "Explorer", year: 2024, trim: "XLT", oemFamily: "ford", scheduleKind: "fixed_interval" },
  { packId: "chevy-traverse-2024-lt", make: "Chevrolet", model: "Traverse", year: 2024, trim: "LT", oemFamily: "chevy", scheduleKind: "fixed_interval" },
  { packId: "nissan-pathfinder-2024-sv", make: "Nissan", model: "Pathfinder", year: 2024, trim: "SV", oemFamily: "nissan", scheduleKind: "fixed_interval" },
  { packId: "toyota-4runner-2024-sr5", make: "Toyota", model: "4Runner", year: 2024, trim: "SR5", oemFamily: "toyota", scheduleKind: "fixed_interval" },
  { packId: "lexus-rx-2024-350", make: "Lexus", model: "RX", year: 2024, trim: "350", oemFamily: "lexus", scheduleKind: "fixed_interval" },
  { packId: "lexus-es-2024-250", make: "Lexus", model: "ES", year: 2024, trim: "250", oemFamily: "lexus", scheduleKind: "fixed_interval" },
  { packId: "acura-tlx-2019-base", make: "Acura", model: "TLX", year: 2019, trim: "Base", oemFamily: "acura", scheduleKind: "maintenance_minder" },
  { packId: "acura-tlx-2019-sh-awd", make: "Acura", model: "TLX", year: 2019, trim: "SH-AWD", powertrain: "3.5L", oemFamily: "acura", scheduleKind: "maintenance_minder" },
  { packId: "acura-rdx-2024-base", make: "Acura", model: "RDX", year: 2024, trim: "Base", oemFamily: "acura", scheduleKind: "maintenance_minder" },
  { packId: "honda-passport-2024-ex-l", make: "Honda", model: "Passport", year: 2024, trim: "EX-L", oemFamily: "honda", scheduleKind: "maintenance_minder" },
  { packId: "tesla-model-3-2024-long-range", make: "Tesla", model: "Model 3", year: 2024, trim: "Long Range", oemFamily: "tesla", scheduleKind: "ev_simplified" },
  { packId: "tesla-model-y-2024-long-range", make: "Tesla", model: "Model Y", year: 2024, trim: "Long Range", oemFamily: "tesla", scheduleKind: "ev_simplified" },
  { packId: "chevy-bolt-2023-1lt", make: "Chevrolet", model: "Bolt EV", year: 2023, trim: "1LT", oemFamily: "ev-generic", scheduleKind: "ev_simplified" },
  { packId: "hyundai-ioniq5-2024-se", make: "Hyundai", model: "IONIQ 5", year: 2024, trim: "SE", oemFamily: "ev-generic", scheduleKind: "ev_simplified" },
  { packId: "kia-ev6-2024-light", make: "Kia", model: "EV6", year: 2024, trim: "Light", oemFamily: "ev-generic", scheduleKind: "ev_simplified" },
  { packId: "ford-mach-e-2024-select", make: "Ford", model: "Mustang Mach-E", year: 2024, trim: "Select", oemFamily: "ev-generic", scheduleKind: "ev_simplified" },
  { packId: "vw-id4-2024-pro", make: "Volkswagen", model: "ID.4", year: 2024, trim: "Pro", oemFamily: "ev-generic", scheduleKind: "ev_simplified" },
  { packId: "nissan-leaf-2024-s", make: "Nissan", model: "LEAF", year: 2024, trim: "S", oemFamily: "ev-generic", scheduleKind: "ev_simplified" },
];

/** Dogfood pack outside Tier-1 table — keep in catalog */
export const DOGFOOD_PACK_IDS = ["acura-tlx-2021-sh-awd"] as const;
