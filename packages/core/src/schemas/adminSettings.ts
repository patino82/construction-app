import { z } from "zod";

export const QuietHoursSchema = z.object({
  start: z.string(),
  end: z.string(),
  tz: z.string(),
  allow: z.array(z.string()).default([])
});

export const AdminSettingsSchema = z.object({
  id: z.string(),
  featureFlags: z.record(z.string(), z.boolean()).default({}),
  quietHours: QuietHoursSchema,
  telegram: z.object({
    chatIdExec: z.number().optional(),
    topics: z.record(z.string(), z.number()),
    commands: z.array(z.string()).default([])
  }),
  webhooks: z.record(z.string(), z.string().url()).default({}),
  stripe: z.object({
    plan: z.string().default("single"),
    tier: z.string().default("default"),
    webhookSecret: z.string().optional()
  }),
  urls: z.object({
    ganttPublicUrl: z.string().url().optional(),
    dashboardBaseUrl: z.string().url().optional()
  }).default({}),
  updatedAt: z.date(),
  createdAt: z.date(),
  notionPageId: z.string()
});

export type AdminSettings = z.infer<typeof AdminSettingsSchema>;
export type QuietHoursConfig = z.infer<typeof QuietHoursSchema>;
