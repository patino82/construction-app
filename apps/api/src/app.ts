import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import multipart from "@fastify/multipart";
import { bootstrapContainer } from "./container";
import logger from "./logger";
import { registerCheckInRoute } from "./routes/checkin";
import { registerPlanIngestRoute } from "./routes/planIngest";
import { registerElementRoutes } from "./routes/elements";
import { registerConfigRoute } from "./routes/config";
import { registerLookAheadRoute } from "./routes/lookahead";
import { registerGanttRoute } from "./routes/gantt";
import { registerTelegramRoutes } from "./routes/telegram";
import { registerSmokeRoute } from "./routes/smoke";
import { registerProjectRoutes } from "./routes/projects";

export async function buildApp() {
  const app = Fastify({ logger });
  const services = await bootstrapContainer();

  await app.register(helmet, { global: true });
  await app.register(cors, { origin: true });
  await app.register(sensible);
  await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } });

  await registerProjectRoutes(app, services);
  await registerConfigRoute(app, services);
  await registerCheckInRoute(app, services);
  await registerPlanIngestRoute(app, services);
  await registerElementRoutes(app, services);
  await registerLookAheadRoute(app, services);
  await registerGanttRoute(app, services);
  await registerTelegramRoutes(app, services);
  await registerSmokeRoute(app, services);

  app.get("/health", async () => ({ status: "ok" }));

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({ error: "not_found", path: request.url });
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ error }, "Unhandled error");
    reply.status(500).send({ error: "internal_error" });
  });

  return app;
}
