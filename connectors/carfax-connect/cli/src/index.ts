#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "../../schema/vehicleos-import.v1.schema.json" with { type: "json" };

type ImportFile = {
  version: "1";
  source: string;
  exportedAt: string;
  vehicle: {
    vin: string;
    year: number;
    make: string;
    model: string;
    trim?: string;
    currentMileage: number;
  };
  services: Array<{
    shop: string;
    serviceDate: string;
    mileage: number;
    lineItems: string[];
    total: string;
    evidenceIds?: string[];
  }>;
};

const usage = (): void => {
  console.log(`Vehicle OS Connect CLI (v0)

Usage:
  vehicleos-connect validate <import.json>
  vehicleos-connect preview <import.json>

Credentials stay on your device. This tool validates local export files only.
`);
};

const loadImport = (filePath: string): ImportFile => {
  const absolutePath = resolve(filePath);
  const raw = readFileSync(absolutePath, "utf8");
  return JSON.parse(raw) as ImportFile;
};

const validateImport = (data: unknown): { ok: true; data: ImportFile } | { ok: false; errors: string[] } => {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid) {
    return {
      ok: false,
      errors: (validate.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "invalid"}`),
    };
  }

  return { ok: true, data: data as ImportFile };
};

const previewEvents = (data: ImportFile): string[] =>
  data.services.flatMap((service, index) => [
    `document.ingested (${data.vehicle.vin} · service ${index + 1})`,
    `document.extraction.completed`,
    `service.recorded · ${service.shop} @ ${service.mileage} mi`,
    `maintenance.recommendation.created (policy evaluates after last service)`,
  ]);

const main = (): void => {
  const [, , command, fileArg] = process.argv;

  if (!command || !fileArg || command === "help" || command === "--help") {
    usage();
    process.exit(command ? 0 : 1);
  }

  let parsed: unknown;
  try {
    parsed = loadImport(fileArg);
  } catch (error) {
    console.error(`Failed to read ${fileArg}:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const result = validateImport(parsed);
  if (!result.ok) {
    console.error("Invalid VehicleOSImport v1 file:");
    result.errors.forEach((line) => console.error(`  - ${line}`));
    process.exit(1);
  }

  if (command === "validate") {
    console.log(
      JSON.stringify(
        {
          status: "valid",
          version: result.data.version,
          source: result.data.source,
          vehicle: `${result.data.vehicle.year} ${result.data.vehicle.make} ${result.data.vehicle.model}`,
          serviceCount: result.data.services.length,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (command === "preview") {
    const events = previewEvents(result.data);
    console.log(JSON.stringify({ status: "preview", events }, null, 2));
    return;
  }

  usage();
  process.exit(1);
};

main();
