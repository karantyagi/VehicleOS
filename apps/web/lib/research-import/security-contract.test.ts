import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RESEARCH_CONSENT_VERSION } from "./types.js";

const migration = readFileSync(
  new URL("../../../../ops/research-cohort/002_paired_extraction_evaluation.sql", import.meta.url),
  "utf8",
);
const observationDefinition = migration.split("create table if not exists research_comparison_observations (")[1]?.split(");")[0] ?? "";
const processingRoute = readFileSync(
  new URL("../../app/api/research/imports/route.ts", import.meta.url),
  "utf8",
);
const quotaMigration = readFileSync(
  new URL("../../../../ops/research-cohort/003_participant_quota.sql", import.meta.url),
  "utf8",
);
const telemetryMigration = readFileSync(
  new URL("../../../../ops/research-cohort/004_evaluation_telemetry.sql", import.meta.url),
  "utf8",
);

describe("research security and retention contract", () => {
  it("requires the full-PDF consent version", () => {
    expect(RESEARCH_CONSENT_VERSION).toBe("research-cohort.v3");
  });

  it("keeps hidden attempts service-role-only and cascades temporary data", () => {
    expect(migration).toContain("references research_import_runs(id) on delete cascade");
    expect(migration).toContain("alter table research_import_attempts enable row level security");
    expect(migration).not.toContain("research import attempts own select");
  });

  it("allows browser upload only for the exact initialized owner path", () => {
    expect(migration).toContain('create policy "research participant uploads initialized pdf"');
    expect(migration).toContain("run.user_id = auth.uid()");
    expect(migration).toContain("run.storage_key = name");
    expect(migration).toContain("run.status = 'uploaded'");
  });

  it("detaches anonymous metrics when the source run is deleted", () => {
    expect(migration).toContain("run_id uuid null unique references research_import_runs(id) on delete set null");
    expect(observationDefinition).not.toContain("user_id");
  });

  it("verifies uploaded bytes against the initialized size and SHA-256 digest", () => {
    expect(processingRoute).toContain("pdfBuffer.length !== claimed.fileBytes");
    expect(processingRoute).toContain("contentSha256 !== claimed.contentSha256");
    expect(processingRoute).toContain('error: "upload_integrity_mismatch"');
  });

  it("keeps the capped pilot quota service-role-only and deletion-safe", () => {
    expect(quotaMigration).toContain("subject_hmac text primary key");
    expect(quotaMigration).toContain("run_id uuid null unique references research_import_runs(id) on delete set null");
    expect(quotaMigration).toContain("active_slots >= 1");
    expect(quotaMigration).toContain("revoke all on function reserve_research_import_quota");
    expect(quotaMigration).toContain("grant execute on function reserve_research_import_quota(uuid, text, integer) to service_role");
  });

  it("records forward-only evaluation states without copying owner data", () => {
    expect(telemetryMigration).toContain("schema_valid boolean null");
    expect(telemetryMigration).toContain("usable_draft boolean not null default false");
    expect(telemetryMigration).toContain("baseline_schema_valid boolean null");
    expect(telemetryMigration).toContain("challenger_usable_draft boolean not null default false");
    expect(telemetryMigration).not.toMatch(/add column[^;\n]*(vin|filename|draft_json|user_id)/i);
  });
});
