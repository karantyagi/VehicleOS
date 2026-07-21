export type ManualScheduleDraftRow = {
  serviceName: string;
  intervalMiles?: number;
  intervalMonths?: number;
  sourcePage?: string;
};

export type StubExtractManualScheduleInput = {
  year: number;
  make: string;
  model: string;
};

export type StubExtractManualScheduleResult = {
  manualTitle: string;
  entries: ManualScheduleDraftRow[];
  extractionNote: string;
};

export const stubExtractManualSchedule = (
  input: StubExtractManualScheduleInput,
): StubExtractManualScheduleResult => ({
  manualTitle: `${input.year} ${input.make} ${input.model} maintenance schedule`,
  extractionNote:
    "Stub extraction for review — confirm intervals against your uploaded manual. Production PDF parsing ships in vehicleos-engine (ENG-6).",
  entries: [
    { serviceName: "Engine oil & filter", intervalMiles: 5_000, intervalMonths: 6, sourcePage: "Maintenance schedule" },
    { serviceName: "Tire rotation", intervalMiles: 7_500, intervalMonths: 6, sourcePage: "Maintenance schedule" },
    { serviceName: "Cabin air filter", intervalMiles: 15_000, intervalMonths: 12, sourcePage: "Maintenance schedule" },
    { serviceName: "Brake fluid inspection", intervalMiles: 30_000, intervalMonths: 36, sourcePage: "Maintenance schedule" },
  ],
});
