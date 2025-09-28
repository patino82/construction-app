import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ServiceContainer } from "../container";
import { requireAdminToken } from "../security";

const PlanIngestBodySchema = z.object({
  projectId: z.string(),
  filename: z.string(),
  notes: z.string().optional(),
  docHash: z.string().optional(),
  elements: z.array(z.object({
    type: z.enum(["door", "wall", "base_cabinet", "note", "unknown"]).optional(),
    identifier: z.string().optional(),
    attributesJson: z.record(z.string(), z.unknown()).optional(),
    sheetRef: z.string().optional(),
    elementKey: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    verified: z.boolean().optional(),
    notes: z.string().optional()
  })).optional()
});

export async function registerPlanIngestRoute(app: FastifyInstance, services: ServiceContainer): Promise<void> {
  app.post("/api/ingest/plan", { preHandler: requireAdminToken }, async (request, reply) => {
    if (request.isMultipart()) {
      const parts = request.parts();
      let buffer: Buffer | null = null;
      let body: any = {};

      for await (const part of parts) {
        if (part.type === "file") {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          buffer = Buffer.concat(chunks);
          body.filename = part.filename ?? "upload";
        } else if (part.type === "field") {
          body[part.fieldname] = part.value;
        }
      }

      if (!buffer) {
        return reply.status(400).send({ error: "missing_file" });
      }

      const parsed = PlanIngestBodySchema.safeParse({
        ...body,
        elements: body.elements ? JSON.parse(body.elements) : undefined
      });
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const result = await services.planIngest.ingest({
        projectId: parsed.data.projectId,
        filename: parsed.data.filename,
        buffer,
        docHash: parsed.data.docHash,
        notes: parsed.data.notes,
        elements: parsed.data.elements as any
      });

      return reply.send(result);
    }

    const parsed = PlanIngestBodySchema.merge(z.object({
      fileBase64: z.string()
    })).parse(request.body);

    const buffer = Buffer.from(parsed.fileBase64, "base64");

    const result = await services.planIngest.ingest({
      projectId: parsed.projectId,
      filename: parsed.filename,
      buffer,
      docHash: parsed.docHash,
      notes: parsed.notes,
      elements: parsed.elements as any
    });

    return reply.send(result);
  });
}
