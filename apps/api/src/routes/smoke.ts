import { FastifyInstance } from "fastify";
import env from "../env";
import { ServiceContainer } from "../container";
import { requireAdminToken } from "../security";

export async function registerSmokeRoute(app: FastifyInstance, services: ServiceContainer): Promise<void> {
  app.post("/api/smoke", { preHandler: requireAdminToken }, async (_request, reply) => {
    const settings = await services.config.getAdminSettings();
    const targets = [
      { name: "FO_CHECKIN", url: env.FO_CHECKIN_WEBHOOK ?? settings.webhooks.FO_CHECKIN_WEBHOOK },
      { name: "COO_DIGEST", url: env.COO_DIGEST_WEBHOOK ?? settings.webhooks.COO_DIGEST_WEBHOOK },
      { name: "MEAL_PLAN", url: env.MEAL_PLAN_WEBHOOK ?? settings.webhooks.MEAL_PLAN_WEBHOOK }
    ].filter((target) => target.url);

    const results = [] as Array<{ name: string; ok: boolean; status?: number }>;

    for (const target of targets) {
      try {
        const response = await fetch(target.url!, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ event: `${target.name}_SMOKE`, dryRun: true })
        });
        results.push({ name: target.name, ok: response.ok, status: response.status });
      } catch (error) {
        results.push({ name: target.name, ok: false });
        app.log.error({ error, target: target.name }, "Smoke webhook failed");
      }
    }

    return reply.send({ results });
  });
}
