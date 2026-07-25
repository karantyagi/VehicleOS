import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { OemSchedulePack, ServiceAliasBundle } from "./types.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const loadSchema = (name: string): object =>
  JSON.parse(readFileSync(join(packageRoot, "schemas", name), "utf8")) as object;

const createValidator = (): Ajv => {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
};

export const validateOemSchedulePack = (pack: unknown): OemSchedulePack => {
  const ajv = createValidator();
  const validate = ajv.compile(loadSchema("oem-schedule-pack.v1.schema.json"));
  if (!validate(pack)) {
    throw new Error(`Invalid OEM schedule pack: ${ajv.errorsText(validate.errors)}`);
  }
  return pack as OemSchedulePack;
};

export const validateServiceAliasBundle = (bundle: unknown): ServiceAliasBundle => {
  const ajv = createValidator();
  const validate = ajv.compile(loadSchema("service-alias-bundle.v1.schema.json"));
  if (!validate(bundle)) {
    throw new Error(`Invalid service alias bundle: ${ajv.errorsText(validate.errors)}`);
  }
  return bundle as ServiceAliasBundle;
};

export const runPackQaRules = (pack: OemSchedulePack): string[] => {
  const issues: string[] = [];

  for (const entry of pack.entries) {
    if (entry.confidence < 0.92 && pack.qaStatus === "auto_verified") {
      issues.push(`${entry.entryId}: confidence ${entry.confidence} below auto_verified threshold`);
    }
    if (!entry.sourcePage.trim()) {
      issues.push(`${entry.entryId}: missing sourcePage`);
    }
    if (entry.intervalMiles == null && entry.intervalMonths == null) {
      issues.push(`${entry.entryId}: needs intervalMiles or intervalMonths`);
    }
    if (
      entry.intervalMiles != null &&
      (entry.intervalMiles < 3000 || entry.intervalMiles > 150_000)
    ) {
      issues.push(`${entry.entryId}: intervalMiles ${entry.intervalMiles} outside sanity bounds`);
    }
  }

  if (pack.qaStatus === "auto_verified" && issues.length > 0) {
    return issues;
  }

  return issues;
};
