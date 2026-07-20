export type WorkerJobType = "ocr" | "extract" | "project" | "recommend";

export interface JobPublisher {
  publish(job: WorkerJobType, payload: Record<string, unknown>): Promise<void>;
}
