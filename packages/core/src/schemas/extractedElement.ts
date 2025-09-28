import { z } from "zod";

export const ExtractedElementSchema = z.object({
  id: z.string(),
  type: z.enum(["door", "wall", "base_cabinet", "note", "unknown"]).default("unknown"),
  identifier: z.string(),
  attributesJson: z.record(z.string(), z.unknown()).default({}),
  sheetRef: z.string().optional(),
  projectId: z.string(),
  source: z.enum(["upload", "manual", "sync"]).default("upload"),
  confidence: z.number().min(0).max(1).default(0.5),
  verified: z.boolean().default(false),
  elementKey: z.string().min(1),
  docHash: z.string().min(1),
  notes: z.string().optional(),
  notionPageId: z.string(),
  updatedAt: z.date(),
  createdAt: z.date()
});

export type ExtractedElement = z.infer<typeof ExtractedElementSchema>;
