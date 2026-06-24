import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));

app.get("/api/vertical-slice", async () => ({
  flow: [
    "document.ingested",
    "document.extraction.completed",
    "service.recorded",
    "maintenance.recommendation.created",
    "task.created"
  ]
}));

const port = Number(process.env.PORT ?? 4000);
app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
