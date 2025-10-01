import logger from "./logger";
import env from "./env";
import { DBIDS } from "./dbids";
import {
  ConfigService,
  NotionService,
  GeoService,
  PlanIngestService,
  GanttService,
  TelegramService,
  StripeService,
  LookAheadService,
  DailyLogService,
  AdminSettings
} from "@execsuite/core";

export interface ServiceContainer {
  notion: NotionService;
  config: ConfigService;
  geo: GeoService;
  planIngest: PlanIngestService;
  gantt: GanttService;
  telegram: TelegramService | null;
  stripe: StripeService;
  lookahead: LookAheadService;
  dailyLogs: DailyLogService;
  refreshTelegram(settings: AdminSettings): void;
}

export async function bootstrapContainer(): Promise<ServiceContainer> {
  const notion = new NotionService({ auth: env.NOTION_TOKEN, notionVersion: env.NOTION_VERSION, logger });

  const config = new ConfigService({
    notion,
    adminDatabaseId: DBIDS.ADMIN_SETTINGS,
    cacheTtlMs: 60_000,
    defaults: {
      quietHours: {
        start: "20:00",
        end: "06:00",
        tz: "America/New_York",
        allow: ["ALERTS", "OPS"]
      }
    }
  });

  const geo = new GeoService();

  const planIngest = new PlanIngestService({
    notion,
    plansDatabaseId: DBIDS.PLANS,
    elementsDatabaseId: DBIDS.ELEMENTS,
    logger
  });

  const gantt = new GanttService({ logger });

  const stripe = new StripeService({ apiKey: env.STRIPE_SECRET_KEY, logger });

  const lookahead = new LookAheadService({
    notion,
    tasksDatabaseId: DBIDS.TASKS,
    lookaheadDatabaseId: DBIDS.LOOKAHEAD,
    logger
  });

  const dailyLogs = new DailyLogService({
    notion,
    dailyLogsDatabaseId: DBIDS.DAILY_LOGS,
    logger
  });

  let telegramInstance: TelegramService | null = null;

  try {
    const preload = await config.getAdminSettings();
    if (env.TELEGRAM_BOT_TOKEN) {
      telegramInstance = new TelegramService({ botToken: env.TELEGRAM_BOT_TOKEN, settings: preload, logger });
    }
  } catch (error) {
    logger.warn({ error }, "Failed to preload admin settings for Telegram bootstrap");
  }

  const container: ServiceContainer = {
    notion,
    config,
    geo,
    planIngest,
    gantt,
    telegram: telegramInstance,
    stripe,
    lookahead,
    dailyLogs,
    refreshTelegram: (next: AdminSettings) => {
      if (!env.TELEGRAM_BOT_TOKEN) return;
      if (container.telegram) {
        container.telegram.updateSettings(next);
        return;
      }
      container.telegram = new TelegramService({ botToken: env.TELEGRAM_BOT_TOKEN, settings: next, logger });
    }
  };

  return container;
}
