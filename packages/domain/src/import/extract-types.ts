/**
 * Layer 1 portal extraction contracts — fixed keys per PDF template.
 * LLM and rules parsers target these shapes; mappers produce Import v1.
 */

export type ExtractFieldConfidence = Record<string, number>;

export type CarfaxServiceHistoryRowExtract = {
  shop: string;
  shopLocation?: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
};

export type CarfaxServiceHistoryExtractV1 = {
  version: "1";
  portal: "carfax-car-care";
  source: string;
  extractedAt: string;
  vehicleHint: {
    maxMileage: number;
  };
  serviceRows: CarfaxServiceHistoryRowExtract[];
  warnings: string[];
  fieldConfidence?: ExtractFieldConfidence;
};

export type MyRmvOwnerLicenseExtract = {
  dateOfBirth: string | null;
  licenseClass: string | null;
  licenseIssued: string | null;
  licenseExpires: string | null;
  passengerStatus: string | null;
  commercialStatus: string | null;
  restrictions: string[];
};

export type MyRmvVehicleExtract = {
  yearMakeModel: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  vin: string | null;
};

export type MyRmvRegistrationExtract = {
  typeNumber: string | null;
  plate: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  status: string | null;
  alreadyRenewed: boolean;
};

export type MyRmvTitleExtract = {
  titleNumber: string | null;
  titleDate: string | null;
  titleStatus: string | null;
};

export type MyRmvMaVehiclePageExtractV1 = {
  version: "1";
  portal: "myrmv-ma";
  source: string;
  extractedAt: string;
  owner: MyRmvOwnerLicenseExtract;
  vehicle: MyRmvVehicleExtract;
  registration: MyRmvRegistrationExtract;
  title: MyRmvTitleExtract;
  warnings: string[];
  fieldConfidence?: ExtractFieldConfidence;
};

export type VehicleImportDefaults = {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  currentMileage: number;
};
