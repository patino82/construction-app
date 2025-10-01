import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

dotenvConfig();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  ADMIN_API_TOKEN: z.string().min(32, "ADMIN_API_TOKEN must be set for protected routes"),
  NOTION_TOKEN: z.string().min(1, "NOTION_TOKEN is required to access Notion"),
  NOTION_VERSION: z.string().default("2022-06-28"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  FO_CHECKIN_WEBHOOK: z.string().url().optional(),
  COO_DIGEST_WEBHOOK: z.string().url().optional(),
  MEAL_PLAN_WEBHOOK: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STORAGE_BUCKET_URL: z.string().url().optional(),
  STORAGE_WRITE_TOKEN: z.string().optional()
});

const env = EnvSchema.parse(process.env);

export type Env = typeof env;
export default env;
