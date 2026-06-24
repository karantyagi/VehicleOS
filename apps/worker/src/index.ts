type JobType = "ocr" | "extract" | "project";

function run(job: JobType): void {
  console.log(`[worker] running job: ${job}`);
}

["ocr", "extract", "project"].forEach((job) => run(job as JobType));
