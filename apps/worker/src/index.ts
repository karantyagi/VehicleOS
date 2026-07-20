import { processExtractJob, type ExtractJobPayload } from "./jobs/extract.js";

type JobType = "extract" | "ocr" | "project" | "recommend";

const parsePayload = (): ExtractJobPayload | null => {
  const raw = process.env.JOB_PAYLOAD;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ExtractJobPayload;
  } catch {
    return null;
  }
};

const run = (job: JobType): void => {
  if (job === "extract") {
    const payload = parsePayload() ?? {
      vehicleId: "demo-vehicle",
      documentId: crypto.randomUUID(),
      storageKey: "receipts/demo.pdf",
    };
    const result = processExtractJob(payload);
    console.log(JSON.stringify({ status: "ok", ...result }));
    return;
  }

  console.log(JSON.stringify({ status: "ok", job, note: "no-op stub for golden-path MVP" }));
};

const job = (process.argv[2] ?? "extract") as JobType;
run(job);
