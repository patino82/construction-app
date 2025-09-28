import { z } from "zod";

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  address: z.string().optional(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  geofenceRadiusMeters: z.number().default(100),
  notionPageId: z.string(),
  status: z.enum(["planning", "active", "complete"]).default("active"),
  updatedAt: z.date(),
  createdAt: z.date()
});

export type Project = z.infer<typeof ProjectSchema>;
