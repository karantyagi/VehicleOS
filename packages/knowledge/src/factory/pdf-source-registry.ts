import type { Tier1PackSpec } from "./tier1-manifest.js";
import { TIER1_PACK_SPECS } from "./tier1-manifest.js";

export type PdfSourceSpec = {
  packId: string;
  candidateUrls: string[];
  notes?: string;
};

const modelFolder = (model: string): string => model.replace(/\s+/g, "-");

const hondaMmUrls = (year: number, model: string): string[] => {
  const folder = modelFolder(model);
  return [
    `https://owners.honda.com/static/pdfs/${year}/${folder}/${year}_${folder}_Maintenance_Minder_System.pdf`,
    `https://owners.honda.com/static/pdfs/${year}/${folder}/${year}_${folder}_Maintenance_Minder.pdf`,
  ];
};

const acuraMmUrls = (year: number, model: string): string[] => {
  const folder = modelFolder(model);
  return [
    `https://owners.acura.com/static/pdfs/${year}/${folder}/${year}_${folder}_Maintenance_Minder_System.pdf`,
    `https://owners.acura.com/static/pdfs/${year}/${folder}/${year}_${folder}_Lane_Maintenance_Minder.pdf`,
    `https://owners.acura.com/static/pdfs/${year}/${folder}/${year}_${folder}_Maintenance_Minder.pdf`,
  ];
};

const toyotaUrls = (year: number, model: string): string[] => {
  const slug = model.replace(/\s+/g, "");
  return [
    `https://assets.sipb.toyota.com/publications/en/omms-s/T-MMS-${String(year).slice(2)}${slug}/pdf/T-MMS-${String(year).slice(2)}${slug}.pdf`,
    `https://www.toyota.com/content/dam/toyota/owners/warranty-and-maintenance/maintenance-schedules/${year}-${model.toLowerCase().replace(/\s+/g, "-")}-maintenance-schedule.pdf`,
  ];
};

const lexusUrls = (year: number, model: string): string[] => {
  const slug = model.replace(/\s+/g, "");
  return [
    `https://assets.sipb.toyota.com/publications/en/omms-s/L-MMS-${String(year).slice(2)}${slug}/pdf/L-MMS-${String(year).slice(2)}${slug}.pdf`,
    `https://assets.sia.toyota.com/publications/en/omms-s/L-MMS-${String(year).slice(2)}${slug}/pdf/L-MMS-${String(year).slice(2)}${slug}.pdf`,
  ];
};

const subaruUrls = (_year: number, _model: string): string[] => [
  "https://techinfo.subaru.com/stis/doc/warrantyBooklet/2024_war_and_maint_041723.pdf",
];

const hyundaiUrls = (year: number, model: string): string[] => {
  const slug = model.toLowerCase().replace(/\s+/g, "-");
  return [
    `https://owners.hyundaiusa.com/content/dam/hyundai/us/myhyundai/manuals/glovebox-manual/${year}/${slug}/`,
  ];
};

const kiaUrls = (_year: number, _model: string): string[] => [];

const nissanUrls = (year: number, model: string): string[] => {
  const slug = model.toLowerCase().replace(/\s+/g, "-");
  return [
    `https://www.nissanusa.com/content/dam/Nissan/us/manuals-and-guides/${slug}/${year}/${year}-nissan-${slug}-owner-manual.pdf`,
  ];
};

const mazdaUrls = (year: number, model: string): string[] => {
  const folder = model.toLowerCase().replace(/\s+/g, "-").replace(/^3$/, "m3s").replace(/^cx-5$/, "cx-5");
  return [
    `https://www.mazdausa.com/siteassets/global-resources/vehicle-resources/owner-manuals/${year}/${folder}/`,
  ];
};

const fordUrls = (year: number, model: string): string[] => {
  const fordModel = model.replace(/\s+/g, "_");
  return [
    `https://www.fordservicecontent.com/Ford_Content/Catalog/owner_information/${year}_Ford_${fordModel}_Owners_Manual_version_1_om_EN-US.pdf`,
  ];
};

const chevyUrls = (year: number, model: string): string[] => {
  const chevModel = model.replace(/\s+/g, "_");
  return [
    `https://contentdelivery.ext.gm.com/content/dam/cope/en_us/public/pdf_assets/active/owners_manuals_browse/${year}/`,
    `https://contentdelivery.ext.gm.com/content/dam/cope/en_us/public/pdf_assets/active/owners_manuals_browse/${year}/${String(year).slice(2)}_CHEV_${chevModel}_OM_en_US`,
  ];
};

const jeepUrls = (_year: number, _model: string): string[] => [];

const vwUrls = (_year: number, _model: string): string[] => [];

const teslaUrls = (year: number, model: string): string[] => {
  if (model.toLowerCase().includes("model 3")) {
    return ["https://www.tesla.com/ownersmanual/model3/en_us/Owners_Manual.pdf"];
  }
  if (model.toLowerCase().includes("model y")) {
    return ["https://www.tesla.com/ownersmanual/2020_2024_modely/en_us/Owners_Manual.pdf"];
  }
  return [`https://www.tesla.com/ownersmanual/${model.toLowerCase().replace(/\s+/g, "-")}/${year}`];
};

const evGenericUrls = (year: number, model: string, make: string): string[] => {
  const slug = model.toLowerCase().replace(/\s+/g, "-");
  const makeSlug = make.toLowerCase().replace(/\s+/g, "-");
  return [
    `https://owners.${makeSlug}.com/content/dam/${makeSlug}/ev/maintenance/${year}-${slug}-maintenance-schedule.pdf`,
  ];
};

/** Pack-specific overrides — researched 2026-07-25. See workspace/knowledge/oem-pdf-url-registry.v1.json */
const PACK_URL_OVERRIDES: Record<string, string[]> = {
  "acura-tlx-2021-sh-awd": [
    "https://owners.acura.com/static/pdfs/2021/TLX/2021_TLX_Maintenance_Minder_System.pdf",
  ],
  "acura-tlx-2019-sh-awd": [
    "https://owners.acura.com/static/pdfs/2019/TLX/2019_TLX_Lane_Maintenance_Minder.pdf",
  ],
  "acura-rdx-2024-base": [
    "https://owners.acura.com/static/pdfs/2024/RDX/2024_RDX_Maintenance_Minder_System.pdf",
  ],
  "honda-cr-v-2024-ex": [
    "https://owners.honda.com/static/pdfs/2024/CR-V/2024_CR-V_Maintenance_Minder_System.pdf",
  ],
  "honda-pilot-2024-ex-l": [
    "https://owners.honda.com/static/pdfs/2024/Pilot/2024_Pilot_Maintenance_Minder_System.pdf",
  ],
  "honda-hrv-2024-ex": [
    "https://owners.honda.com/static/pdfs/2024/HR-V/2024_HR-V_Maintenance_Minder_System.pdf",
  ],
  "honda-passport-2024-ex-l": [
    "https://owners.honda.com/static/pdfs/2024/Passport/2024_Passport_Maintenance_Minder.pdf",
  ],
  "honda-accord-2024-ex": [
    "https://owners.honda.com/utility/download?path=/static/pdfs/2024/Accord+Sedan/2024_Accord_4D_Maintenance_Minder.pdf",
  ],
  "honda-civic-2024-sport": [
    "https://owners.honda.com/utility/download?path=/static/pdfs/2024/Civic+Sedan/2024_Civic_4D_Maintenance_Minder_System.pdf",
    "https://owners.honda.com/utility/download?path=/static/pdfs/2024/Civic+Hatchback/2024_Civic_5D_Maintenance_Minder.pdf",
  ],
  "toyota-camry-2024-le": [
    "https://assets.sipb.toyota.com/publications/en/omms-s/T-MMS-24Camry/pdf/T-MMS-24Camry.pdf",
  ],
  "toyota-camry-2024-xse": [
    "https://assets.sipb.toyota.com/publications/en/omms-s/T-MMS-24Camry/pdf/T-MMS-24Camry.pdf",
  ],
  "toyota-corolla-2024-le": [
    "https://assets.sipb.toyota.com/publications/en/omms-s/T-MMS-24Corolla/pdf/T-MMS-24Corolla.pdf",
  ],
  "toyota-prius-2024-xle": [
    "https://assets.sipb.toyota.com/publications/en/omms-s/T-MMS-24Prius/pdf/T-MMS-24Prius.pdf",
  ],
  "toyota-rav4-2024-le": [
    "https://assets.sipb.toyota.com/publications/en/omms-s/T-MMS-24RAV4/pdf/T-MMS-24RAV4.pdf",
  ],
  "toyota-rav4-2024-hybrid-xle": [
    "https://assets.sipb.toyota.com/publications/en/omms-s/T-MMS-24RAV4/pdf/T-MMS-24RAV4.pdf",
  ],
  "toyota-corolla-cross-2024-se": [
    "https://assets.sipb.toyota.com/publications/en/omms-s/T-MMS-24CorollaCross/pdf/T-MMS-24CorollaCross.pdf",
  ],
  "toyota-highlander-2024-le": [
    "https://assets.sipb.toyota.com/publications/en/omms-s/T-MMS-24Highlander/pdf/T-MMS-24Highlander.pdf",
  ],
  "toyota-4runner-2024-sr5": [
    "https://assets.sipb.toyota.com/publications/en/omms-s/T-MMS-244Runner/pdf/T-MMS-244Runner.pdf",
  ],
  "lexus-rx-2024-350": [
    "https://assets.sipb.toyota.com/publications/en/omms-s/L-MMS-24RX350/pdf/L-MMS-24RX350.pdf",
  ],
  "lexus-es-2024-250": [
    "https://assets.sia.toyota.com/publications/en/omms-s/L-MMS-24ES250ES350/pdf/L-MMS-24ES250ES350.pdf",
  ],
  "hyundai-elantra-2024-se": [
    "https://owners.hyundaiusa.com/content/dam/hyundai/us/myhyundai/manuals/glovebox-manual/2024/elantra/2024%20Elantra%20ICE%20and%20N-Line%20(CN7)%20OM.pdf",
  ],
  "hyundai-tucson-2024-se": [
    "https://owners.hyundaiusa.com/content/dam/hyundai/us/myhyundai/manuals/glovebox-manual/2024/tucson/2024_Tucson_Owners_Manual.pdf",
  ],
  "hyundai-santa-fe-2024-se": [
    "https://owners.hyundaiusa.com/content/dam/hyundai/us/myhyundai/manuals/glovebox-manual/2024/santa-fe/MX5a-2024-en_US-WEB-2C.pdf",
  ],
  "hyundai-ioniq5-2024-se": [
    "https://owners.hyundaiusa.com/content/dam/hyundai/us/myhyundai/manuals/glovebox-manual/2024/ioniq-5/2024%20Ioniq%205%20OM.pdf",
  ],
  // Exact-byte public mirrors of the KGIS session-gated owner manuals.
  // Verified 2026-07-26 by SHA-256 against fresh owners.kia.com -> KGIS downloads.
  "kia-k5-2024-lxs": [
    "https://manuals.startmycar.com/published/Kia-K5_2024_EN_US_e6ae80d227.pdf",
  ],
  "kia-sportage-2024-lx": [
    "https://manuals.startmycar.com/published/Kia-Sportage_2024_EN-US_US_979e9e6749.pdf",
  ],
  "kia-telluride-2024-lx": [
    "https://manuals.startmycar.com/published/Kia-Telluride_2024_EN_US_60a621055c.pdf",
  ],
  "kia-ev6-2024-light": [
    "https://manuals.opinautos.com/published/Kia-EV6_2024_EN-US_US_ef71c5ee49.pdf",
  ],
  "nissan-altima-2024-sv": [
    "https://www.nissanusa.com/content/dam/Nissan/us/manuals-and-guides/altima/2024/2024-nissan-altima-owner-manual.pdf",
  ],
  "nissan-rogue-2024-sv": [
    "https://www.nissanusa.com/content/dam/Nissan/us/manuals-and-guides/rogue/2024/2024-nissan-rogue-owner-manual.pdf",
  ],
  "nissan-pathfinder-2024-sv": [
    "https://www.nissanusa.com/content/dam/Nissan/us/manuals-and-guides/pathfinder/2024/2024-nissan-pathfinder-owner-manual.pdf",
  ],
  "nissan-leaf-2024-s": [
    "https://www.nissanusa.com/content/dam/Nissan/us/manuals-and-guides/leaf/2024/2024-nissan-leaf-owner-manual.pdf",
  ],
  "mazda3-2024-select": [
    "https://www.mazdausa.com/siteassets/global-resources/vehicle-resources/owner-manuals/2024/m3s/2024-mazda3-hatchback-sedan-owners-manual.pdf",
  ],
  "mazda-cx5-2024-preferred": [
    "https://www.mazdausa.com/siteassets/global-resources/vehicle-resources/owner-manuals/2024/cx-5/2024-mazda-cx-5-vehicle-owners-manual.pdf",
  ],
  "mazda-cx30-2024-select": [
    "https://www.mazdausa.com/siteassets/global-resources/vehicle-resources/owner-manuals/2024/cx-30/2024-cx-30-owners-manual.pdf",
  ],
  "subaru-impreza-2024-base": [
    "https://techinfo.subaru.com/stis/doc/warrantyBooklet/2024_war_and_maint_041723.pdf",
  ],
  "subaru-forester-2024-premium": [
    "https://techinfo.subaru.com/stis/doc/warrantyBooklet/2024_war_and_maint_041723.pdf",
  ],
  "subaru-crosstrek-2024-premium": [
    "https://techinfo.subaru.com/stis/doc/warrantyBooklet/2024_war_and_maint_041723.pdf",
  ],
  "subaru-outback-2024-premium": [
    "https://techinfo.subaru.com/stis/doc/warrantyBooklet/2024_war_and_maint_041723.pdf",
  ],
  "ford-escape-2024-se": [
    "https://www.fordservicecontent.com/Ford_Content/Catalog/owner_information/2024_Ford_Escape_Owners_Manual_version_1_om_EN-US.pdf",
  ],
  "ford-explorer-2024-xlt": [
    "https://www.fordservicecontent.com/Ford_Content/Catalog/owner_information/2024_Ford_Explorer_Owners_Manual_version_1_om_EN-US.pdf",
  ],
  "ford-mach-e-2024-select": [
    "https://www.fordservicecontent.com/Ford_Content/Catalog/owner_information/2024_Ford_Mustang_Mach-E_Owners_Manual_version_1_om_EN-US.pdf",
  ],
  "chevy-equinox-2024-lt": [
    "https://contentdelivery.ext.gm.com/content/dam/cope/en_us/public/pdf_assets/active/owners_manuals_browse/2024/24_CHEV_Equinox_OM_en_US_U_85150510B_2023JUL27_2P_INS1.pdf",
  ],
  "chevy-traverse-2024-lt": [
    "https://contentdelivery.ext.gm.com/content/dam/cope/en_us/public/pdf_assets/active/owners_manuals_browse/2024/24_CHEV_Traverse_OM_en_US_U_17442647D_2024OCT10_4P.pdf",
  ],
  "chevy-bolt-2023-1lt": [
    "https://contentdelivery.ext.gm.com/content/dam/cope/en_us/public/pdf_assets/active/owners_manuals_browse/2023/23_CHEV_Bolt_EV_OM_en_US_U_84953304C_2023MAR10_3P.pdf",
  ],
  "vw-jetta-2024-s": [
    "https://ownersliterature.vw.com/owners-literature-service/v1/document/11025511-673f-445a-a6a5-20b5f3e5cc59",
  ],
  "vw-id4-2024-pro": [
    "https://ownersliterature.vw.com/owners-literature-service/v1/document/2721b3eb-0228-4be4-94d6-0b8e24dbf74c",
  ],
  "tesla-model-3-2024-long-range": [
    "https://www.tesla.com/ownersmanual/model3/en_us/Owners_Manual.pdf",
  ],
  "tesla-model-y-2024-long-range": [
    "https://www.tesla.com/ownersmanual/2020_2024_modely/en_us/Owners_Manual.pdf",
  ],
};

export const resolvePdfSourceSpec = (input: {
  packId: string;
  make: string;
  model: string;
  year: number;
  oemFamily: Tier1PackSpec["oemFamily"];
}): PdfSourceSpec => {
  const override = PACK_URL_OVERRIDES[input.packId];
  if (override) {
    return { packId: input.packId, candidateUrls: override };
  }

  const { year, model, make, oemFamily, packId } = input;
  let candidateUrls: string[] = [];

  switch (oemFamily) {
    case "honda":
      candidateUrls = hondaMmUrls(year, model);
      break;
    case "acura":
      candidateUrls = acuraMmUrls(year, model);
      break;
    case "toyota":
    case "lexus":
      candidateUrls = oemFamily === "lexus" ? lexusUrls(year, model) : toyotaUrls(year, model);
      break;
    case "subaru":
      candidateUrls = subaruUrls(year, model);
      break;
    case "hyundai":
      candidateUrls = hyundaiUrls(year, model);
      break;
    case "kia":
      candidateUrls = kiaUrls(year, model);
      break;
    case "nissan":
      candidateUrls = nissanUrls(year, model);
      break;
    case "mazda":
      candidateUrls = mazdaUrls(year, model);
      break;
    case "ford":
      candidateUrls = fordUrls(year, model);
      break;
    case "chevy":
      candidateUrls = chevyUrls(year, model);
      break;
    case "jeep":
      candidateUrls = jeepUrls(year, model);
      break;
    case "vw":
      candidateUrls = vwUrls(year, model);
      break;
    case "tesla":
      candidateUrls = teslaUrls(year, model);
      break;
    case "ev-generic":
      candidateUrls = evGenericUrls(year, model, make);
      break;
    default:
      candidateUrls = [];
  }

  return { packId, candidateUrls };
};

export const allPackPdfSources = (): PdfSourceSpec[] => {
  const dogfood: PdfSourceSpec = {
    packId: "acura-tlx-2021-sh-awd",
    candidateUrls: PACK_URL_OVERRIDES["acura-tlx-2021-sh-awd"] ?? [],
  };

  const tier1 = TIER1_PACK_SPECS.map((spec) =>
    resolvePdfSourceSpec({
      packId: spec.packId,
      make: spec.make,
      model: spec.model,
      year: spec.year,
      oemFamily: spec.oemFamily,
    }),
  );

  const seen = new Set<string>();
  return [dogfood, ...tier1].filter((spec) => {
    if (seen.has(spec.packId)) return false;
    seen.add(spec.packId);
    return true;
  });
};
