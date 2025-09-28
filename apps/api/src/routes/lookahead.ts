import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ServiceContainer } from "../container";
import { requireAdminToken } from "../security";

const LookAheadBuildSchema = z.object({
  weekStartIso: z.string().regex(/\d{4}-\d{2}-\d{2}/),
  projectId: z.string().optional(),
  idempotencyKey: z.string().min(8)
});

export async function registerLookAheadRoute(app: FastifyInstance, services: ServiceContainer): Promise<void> {
  app.post("/api/lookahead/build", { preHandler: requireAdminToken }, async (request, reply) => {
    const payload = LookAheadBuildSchema.parse(request.body);
    const rows = await services.lookahead.buildLookAhead(payload);
    return reply.send({ rows });
  });
}
