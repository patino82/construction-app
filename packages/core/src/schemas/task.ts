import { z } from "zod";

export const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  projectId: z.string(),
  stage: z.string(),
  sequence: z.number().default(0),
  trade: z.string().optional(),
  owner: z.string().optional(),
  startDate: z.coerce.date().nullable(),
  finishDate: z.coerce.date().nullable(),
  needBy: z.coerce.date().nullable(),
  status: z.enum(["pending", "in_progress", "blocked", "complete", "hold"]).default("pending"),
  scheduleJson: z.record(z.string(), z.unknown()).optional().default({}),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  idempotencyKey: z.string().min(10),
  notionPageId: z.string(),
  updatedAt: z.date(),
  createdAt: z.date()
});

export type Task = z.infer<typeof TaskSchema>;
