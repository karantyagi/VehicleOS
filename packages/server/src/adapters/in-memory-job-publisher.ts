import type { JobPublisher, WorkerJobType } from "@vehicleos/domain";

export type PublishedJob = {
  job: WorkerJobType;
  payload: Record<string, unknown>;
  publishedAt: string;
};

export class InMemoryJobPublisher implements JobPublisher {
  readonly jobs: PublishedJob[] = [];

  async publish(job: WorkerJobType, payload: Record<string, unknown>): Promise<void> {
    this.jobs.push({
      job,
      payload,
      publishedAt: new Date().toISOString(),
    });
  }
}
