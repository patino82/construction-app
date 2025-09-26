import { z } from "zod";

export const DailyLogSchema = z.object({
  id: z.string(),
  date: z.coerce.date(),
  projectId: z.string(),
  notes: z.string().optional(),
  weather: z.string().optional(),
  manpowerCount: z.number().default(0),
  issues: z.array(z.string()).default([]),
  gpsCheckins: z.array(z.object({
    timestamp: z.coerce.date(),
    latitude: z.number(),
    longitude: z.number(),
    accuracyMeters: z.number().optional()
  })).default([]),
  notionPageId: z.string(),
  updatedAt: z.date(),
  createdAt: z.date()
});

export type DailyLog = z.infer<typeof DailyLogSchema>;
