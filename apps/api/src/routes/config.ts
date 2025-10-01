import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ServiceContainer } from "../container";
import { requireAdminToken } from "../security";

const ConfigUpdateSchema = z.object({
  featureFlags: z.record(z.string(), z.boolean()).optional(),
  urls: z.object({
    ganttPublicUrl: z.string().url().optional(),
    dashboardBaseUrl: z.string().url().optional()
  }).optional(),
  telegram: z.object({
    commands: z.array(z.string()).optional(),
    topics: z.record(z.string(), z.number()).optional(),
    chatIdExec: z.number().optional()
  }).optional(),
  quietHours: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
    tz: z.string().optional(),
    allow: z.array(z.string()).optional()
  }).optional()
});

export async function registerConfigRoute(app: FastifyInstance, services: ServiceContainer): Promise<void> {
  app.get("/api/config", { preHandler: requireAdminToken }, async (_request, reply) => {
    const settings = await services.config.getAdminSettings();
    return reply.send(settings);
  });

  app.put("/api/config", { preHandler: requireAdminToken }, async (request, reply) => {
    const payload = ConfigUpdateSchema.parse(request.body);
    const current = await services.config.getAdminSettings();

    const next = await services.config.updateAdminSettings({
      featureFlags: payload.featureFlags ? { ...current.featureFlags, ...payload.featureFlags } : current.featureFlags,
      urls: payload.urls ? { ...current.urls, ...payload.urls } : current.urls,
      telegram: payload.telegram ? { ...current.telegram, ...payload.telegram } : current.telegram,
      quietHours: payload.quietHours ? { ...current.quietHours, ...payload.quietHours } : current.quietHours,
      webhooks: current.webhooks,
      stripe: current.stripe
    });

    services.refreshTelegram(next);

    return reply.send(next);
  });
}
