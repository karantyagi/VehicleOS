import Fastify from "fastify";
import {
  GOLDEN_PATH_FLOW,
  InMemoryEventStore,
  StubPolicyEngine,
  recordServiceAndRecommend,
} from "@vehicleos/domain";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));

app.get("/api/vertical-slice", async () => ({
  flow: GOLDEN_PATH_FLOW,
}));

app.post("/api/demo/golden-path", async () => {
  const eventStore = new InMemoryEventStore();
  const policyEngine = new StubPolicyEngine();
  const vehicleId = crypto.randomUUID();

  const result = await recordServiceAndRecommend({
    eventStore,
    policyEngine,
    input: {
      vehicleId,
      shop: "Jiffy Lube",
      serviceDate: "2026-01-12",
      mileage: 41_800,
      lineItems: ["Oil change (synthetic)", "Filter replaced"],
      total: "$67.42",
      evidenceIds: ["demo-evidence-1"],
    },
  });

  return {
    vehicleId,
    eventCount: result.events.length,
    timeline: result.state.timeline,
    nowQueue: result.state.nowQueue,
    recommendation: result.recommendation,
    task: result.task,
  };
});

const port = Number(process.env.PORT ?? 4000);
app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
