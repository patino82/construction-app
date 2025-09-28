import { FastifyInstance } from "fastify";
import { ServiceContainer } from "../container";
import { requireAdminToken } from "../security";

export async function registerTelegramRoutes(app: FastifyInstance, services: ServiceContainer): Promise<void> {
  app.post("/api/telegram/register-commands", { preHandler: requireAdminToken }, async (_request, reply) => {
    const settings = await services.config.getAdminSettings(true);
    services.refreshTelegram(settings);

    if (!services.telegram) {
      return reply.status(202).send({ message: "telegram_disabled" });
    }

    await services.telegram.registerCommands();
    return reply.send({ ok: true });
  });
}
