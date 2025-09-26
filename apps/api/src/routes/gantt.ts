import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ServiceContainer } from "../container";
import { requireAdminToken } from "../security";

const LookAheadRowSchema = z.object({
  id: z.string(),
  weekStartIso: z.string(),
  project: z.string(),
  task: z.string(),
  trade: z.string().nullable().optional(),
  owner: z.string().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  finishDate: z.coerce.date().nullable().optional(),
  needBy: z.coerce.date().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "critical", "planned", "committed", "at_risk", "done"]).optional(),
  status: z.enum(["planned", "committed", "at_risk", "done"]).optional(),
  scheduleJson: z.record(z.string(), z.unknown()).optional().default({}),
  idempotencyKey: z.string()
});

const GanttRenderSchema = z.object({
  title: z.string().default("3 Week Look Ahead"),
  weekStartIso: z.string().regex(/\d{4}-\d{2}-\d{2}/),
  rows: z.array(LookAheadRowSchema),
  persistToConfig: z.boolean().optional()
});

export async function registerGanttRoute(app: FastifyInstance, services: ServiceContainer): Promise<void> {
  app.post("/api/gantt/render", { preHandler: requireAdminToken }, async (request, reply) => {
    const payload = GanttRenderSchema.parse(request.body);

    const result = await services.gantt.render(payload.rows.map((row) => ({
      ...row,
      startDate: row.startDate ?? undefined,
      finishDate: row.finishDate ?? undefined,
      needBy: row.needBy ?? undefined
    })), {
      title: payload.title,
      weekOf: payload.weekStartIso
    });

    if (payload.persistToConfig) {
      await services.config.updateAdminSettings({
        urls: {
          ...(await services.config.getAdminSettings()).urls,
          ganttPublicUrl: result.url
        }
      });
    }

    return reply.send({
      url: result.url,
      contentType: result.contentType
    });
  });
}
