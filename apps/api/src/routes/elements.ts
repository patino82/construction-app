import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ServiceContainer } from "../container";
import { DBIDS } from "../dbids";

const ElementQuerySchema = z.object({
  type: z.enum(["door", "wall", "base_cabinet", "note", "unknown"]).optional(),
  projectId: z.string().optional(),
  sheetRef: z.string().optional(),
  q: z.string().optional()
});

export async function registerElementRoutes(app: FastifyInstance, services: ServiceContainer): Promise<void> {
  app.get("/api/elements/search", async (request, reply) => {
    const parsed = ElementQuerySchema.parse(request.query);

    const filter: Record<string, unknown> | undefined = buildNotionFilter(parsed);

    const elements = await services.notion.listDatabase(DBIDS.ELEMENTS, mapNotionElement, filter ? { filter } : undefined);

    const filtered = parsed.q
      ? elements.filter((element) => {
          const haystack = [element.identifier, element.notes, JSON.stringify(element.attributesJson)].join(" ").toLowerCase();
          return haystack.includes(parsed.q!.toLowerCase());
        })
      : elements;

    return reply.send({ elements: filtered });
  });
}

function buildNotionFilter(params: z.infer<typeof ElementQuerySchema>): Record<string, unknown> | undefined {
  const filters: Record<string, unknown>[] = [];

  if (params.type) {
    filters.push({ property: "Type", select: { equals: params.type } });
  }

  if (params.projectId) {
    filters.push({ property: "Project", relation: { contains: params.projectId } });
  }

  if (params.sheetRef) {
    filters.push({ property: "Sheet Ref", rich_text: { contains: params.sheetRef } });
  }

  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];

  return { and: filters };
}

function mapNotionElement(page: any) {
  const properties = page.properties ?? {};
  const identifier = properties["Name"]?.title?.[0]?.plain_text ?? page.id;
  const type = properties["Type"]?.select?.name ?? "unknown";
  const sheetRef = properties["Sheet Ref"]?.rich_text?.[0]?.plain_text;
  const attributes = properties["Attributes"]?.rich_text?.[0]?.plain_text;
  const projectId = properties["Project"]?.relation?.[0]?.id ?? "";
  const confidence = properties["Confidence"]?.number ?? 0.5;
  const verified = properties["Verified"]?.checkbox ?? false;
  const docHash = properties["Doc Hash"]?.rich_text?.[0]?.plain_text ?? "";
  const elementKey = properties["Element Key"]?.rich_text?.[0]?.plain_text ?? identifier;
  const notes = properties["Notes"]?.rich_text?.[0]?.plain_text;

  return {
    id: page.id,
    type,
    identifier,
    attributesJson: safeJson(attributes),
    sheetRef,
    projectId,
    source: properties["Source"]?.select?.name ?? "upload",
    confidence,
    verified,
    elementKey,
    docHash,
    notes,
    notionPageId: page.id,
    updatedAt: new Date(page.last_edited_time),
    createdAt: "created_time" in page ? new Date(page.created_time) : new Date()
  };
}

function safeJson(value?: string): Record<string, unknown> {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
