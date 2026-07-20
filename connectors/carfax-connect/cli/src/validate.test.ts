import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "../../schema/vehicleos-import.v1.schema.json";

describe("vehicleos-import.v1 schema", () => {
  it("accepts a minimal valid import file", () => {
    const samplePath = resolve(import.meta.dirname, "../../examples/sample-import.v1.json");
    const sample = JSON.parse(readFileSync(samplePath, "utf8"));

    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);

    expect(validate(sample)).toBe(true);
  });
});
