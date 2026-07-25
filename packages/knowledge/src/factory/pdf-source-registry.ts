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

const lexusUrls = (year: number, model: string): string[] => {
  const folder = modelFolder(model);
  return [
    `https://www.lexus.com/static/owners/pdf/${year}/${folder}/${year}_${folder}_Maintenance_Schedule.pdf`,
    `https://www.lexus.com/content/dam/lexus/documents/owners/maintenance/${year}-${folder.toLowerCase()}-maintenance.pdf`,
  ];
};

const toyotaUrls = (year: number, model: string): string[] => {
  const slug = model.toLowerCase().replace(/\s+/g, "-");
  return [
    `https://www.toyota.com/content/dam/toyota/owners/warranty-and-maintenance/maintenance-schedules/${year}-${slug}-maintenance-schedule.pdf`,
    `https://www.toyota.com/content/dam/toyota/owners/warranty-and-maintenance/maintenance-schedules/${year}/${year}_${model.replace(/\s+/g, "_")}_Maintenance_Guide.pdf`,
  ];
};

const subaruUrls = (year: number, model: string): string[] => {
  const folder = modelFolder(model);
  return [
    `https://www.subaru.com/content/dam/subaru/owners/manuals/${year}/${folder}/maintenance-schedule.pdf`,
    `https://www.subaru.com/content/dam/subaru/owners/manuals/${year}/${folder}/${year}-${folder.toLowerCase()}-maintenance-schedule.pdf`,
  ];
};

const hyundaiUrls = (year: number, model: string): string[] => {
  const slug = model.toLowerCase().replace(/\s+/g, "-");
  return [
    `https://owners.hyundaiusa.com/content/dam/hyundai/us/myhyundai/resources/maintenance/${year}-${slug}-maintenance-schedule.pdf`,
  ];
};

const kiaUrls = (year: number, model: string): string[] => {
  const slug = model.toLowerCase().replace(/\s+/g, "-");
  return [
    `https://owners.kia.com/content/dam/kia/us/en/owners/maintenance/${year}-${slug}-maintenance-schedule.pdf`,
  ];
};

const nissanUrls = (year: number, model: string): string[] => {
  const slug = model.toLowerCase().replace(/\s+/g, "-");
  return [
    `https://www.nissanusa.com/content/dam/Nissan/us/owners/maintenance/${year}-${slug}-maintenance-schedule.pdf`,
  ];
};

const mazdaUrls = (year: number, model: string): string[] => {
  const slug = model.toLowerCase().replace(/\s+/g, "-");
  return [
    `https://www.mazdausa.com/content/dam/mazda/us/mazdaowners/maintenance/${year}-${slug}-maintenance-schedule.pdf`,
  ];
};

const fordUrls = (year: number, model: string): string[] => {
  const slug = model.toLowerCase().replace(/\s+/g, "-");
  return [
    `https://www.ford.com/content/dam/ford/owners/maintenance/${year}-${slug}-maintenance-schedule.pdf`,
  ];
};

const chevyUrls = (year: number, model: string): string[] => {
  const slug = model.toLowerCase().replace(/\s+/g, "-");
  return [
    `https://www.chevrolet.com/content/dam/chevrolet/owners/maintenance/${year}-${slug}-maintenance-schedule.pdf`,
  ];
};

const jeepUrls = (year: number, model: string): string[] => {
  const slug = model.toLowerCase().replace(/\s+/g, "-");
  return [
    `https://www.jeep.com/content/dam/jeep/owners/maintenance/${year}-${slug}-maintenance-schedule.pdf`,
  ];
};

const vwUrls = (year: number, model: string): string[] => {
  const slug = model.toLowerCase().replace(/\s+/g, "-");
  return [
    `https://www.vw.com/content/dam/vw/owners/maintenance/${year}-${slug}-maintenance-schedule.pdf`,
  ];
};

const teslaUrls = (year: number, model: string): string[] => {
  const slug = model.toLowerCase().replace(/\s+/g, "-");
  return [
    `https://www.tesla.com/ownersmanual/${slug}/${year}`,
    `https://www.tesla.com/sites/default/files/model_${slug.replace("-", "_")}_owners_manual.pdf`,
  ];
};

const evGenericUrls = (year: number, model: string, make: string): string[] => {
  const slug = model.toLowerCase().replace(/\s+/g, "-");
  const makeSlug = make.toLowerCase().replace(/\s+/g, "-");
  return [
    `https://owners.${makeSlug}.com/content/dam/${makeSlug}/ev/maintenance/${year}-${slug}-maintenance-schedule.pdf`,
  ];
};

/** Pack-specific overrides where probing found working URLs. */
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
