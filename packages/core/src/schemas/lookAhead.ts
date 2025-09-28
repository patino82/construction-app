import { z } from "zod";

export const LookAheadRowSchema = z.object({
  id: z.string(),
  weekStartIso: z.string(),
  project: z.string(),
  task: z.string(),
  trade: z.string().optional(),
  owner: z.string().optional(),
  startDate: z.coerce.date().nullable(),
  finishDate: z.coerce.date().nullable(),
  needBy: z.coerce.date().nullable(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["planned", "committed", "at_risk", "done"]).default("planned"),
  scheduleJson: z.record(z.string(), z.unknown()).default({}),
  idempotencyKey: z.string().min(1),
  notionPageId: z.string(),
  updatedAt: z.date(),
  createdAt: z.date()
});

export type LookAheadRow = z.infer<typeof LookAheadRowSchema>;
