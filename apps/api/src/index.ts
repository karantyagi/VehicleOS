import { buildApp } from "./app.js";
import { closePool } from "./db/pool.js";

const port = Number(process.env.PORT ?? 4000);

const start = async (): Promise<void> => {
  const app = await buildApp();

  const shutdown = async () => {
    await app.close();
    await closePool();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    await closePool();
    process.exit(1);
  }
};

start();
