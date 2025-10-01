import env from "./env";
import logger from "./logger";
import { buildApp } from "./app";
import { startTelemetry, stopTelemetry } from "./telemetry";

async function main() {
  await startTelemetry();
  const app = await buildApp();

  const close = async () => {
    await app.close();
    await stopTelemetry();
    process.exit(0);
  };

  process.on("SIGTERM", close);
  process.on("SIGINT", close);

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    logger.info({ port: env.PORT }, "API server started");
  } catch (error) {
    logger.error({ error }, "Failed to start server");
    await stopTelemetry();
    process.exit(1);
  }
}

main();
