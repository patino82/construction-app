import { AdminSettings, AdminSettingsSchema, QuietHoursConfig } from "../schemas/adminSettings";
import { NotionService } from "./notionService";
import { TTLCache } from "../utils/cache";

export interface ConfigServiceOptions {
  adminDatabaseId: string;
  notion: NotionService;
  cacheTtlMs?: number;
  defaults?: Partial<AdminSettings>;
}

export class ConfigService {
  private readonly cache: TTLCache<string, AdminSettings>;
  private readonly notion: NotionService;
  private readonly adminDatabaseId: string;
  private readonly defaults?: Partial<AdminSettings>;

  constructor(options: ConfigServiceOptions) {
    this.adminDatabaseId = options.adminDatabaseId;
    this.notion = options.notion;
    this.cache = new TTLCache<string, AdminSettings>(options.cacheTtlMs ?? 60_000);
    this.defaults = options.defaults;
  }

  async getAdminSettings(forceRefresh = false): Promise<AdminSettings> {
    const cacheKey = "admin-settings";
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const settings = await this.notion.listDatabase(this.adminDatabaseId, mapAdminSettingsPage);
    if (settings.length === 0) {
      throw new Error("Admin settings database is empty");
    }

    const merged = AdminSettingsSchema.parse({ ...this.defaults, ...settings[0] });
    this.cache.set(cacheKey, merged);
    return merged;
  }

  async getQuietHours(): Promise<QuietHoursConfig> {
    const settings = await this.getAdminSettings();
    return settings.quietHours;
  }

  clear(): void {
    this.cache.clear();
  }

  async updateAdminSettings(update: Partial<AdminSettings>): Promise<AdminSettings> {
    const current = await this.getAdminSettings();
    const next = AdminSettingsSchema.parse({ ...current, ...update });

    await this.notion.rawClient.pages.update({
      page_id: current.notionPageId,
      properties: buildAdminSettingsProperties(next)
    });

    this.cache.set("admin-settings", next);
    return next;
  }
}

function mapAdminSettingsPage(page: any): AdminSettings {
  if (!("properties" in page)) {
    throw new Error("Invalid Notion page payload for admin settings");
  }

  const featureFlagsProperty = page.properties["Feature Flags"];
  const quietStart = page.properties["Quiet Start"];
  const quietEnd = page.properties["Quiet End"];
  const quietTz = page.properties["Quiet TZ"];
  const quietAllow = page.properties["Quiet Allow"];
  const telegramTopics = page.properties["Telegram Topics"];
  const telegramCommands = page.properties["Telegram Commands"];
  const telegramChatId = page.properties["Telegram Chat"];
  const webhookUrls = page.properties["Webhooks"];
  const stripePlan = page.properties["Stripe Plan"];
  const stripeTier = page.properties["Stripe Tier"];
  const stripeWebhook = page.properties["Stripe Webhook"];
  const ganttUrl = page.properties["Gantt URL"];
  const dashboardUrl = page.properties["Dashboard URL"];

  const featureFlags: Record<string, boolean> = {};
  if (featureFlagsProperty?.type === "multi_select") {
    for (const option of featureFlagsProperty.multi_select) {
      featureFlags[option.name] = true;
    }
  }

  const allowTopics = new Set<string>();
  if (quietAllow?.type === "multi_select") {
    quietAllow.multi_select.forEach((option: { name: string }) => {
      allowTopics.add(option.name.toUpperCase());
    });
  }

  const telegramTopicMap: Record<string, number> = {};
  if (telegramTopics?.type === "multi_select") {
    for (const option of telegramTopics.multi_select) {
      const [key, value] = option.name.split(":");
      if (key && value) {
        const numeric = Number.parseInt(value.trim(), 10);
        if (!Number.isNaN(numeric)) {
          telegramTopicMap[key.trim().toUpperCase()] = numeric;
        }
      }
    }
  }

  const commands: string[] = [];
  if (telegramCommands?.type === "multi_select") {
    for (const option of telegramCommands.multi_select) {
      commands.push(option.name);
    }
  }

  const webhooks: Record<string, string> = {};
  if (webhookUrls?.type === "rich_text") {
    webhookUrls.rich_text.forEach((text: { plain_text: string }) => {
      const [key, url] = text.plain_text.split("=");
      if (key && url) {
        webhooks[key.trim()] = url.trim();
      }
    });
  }

  return AdminSettingsSchema.parse({
    id: page.id,
    featureFlags,
    quietHours: {
      start: quietStart?.type === "rich_text" && quietStart.rich_text[0] ? quietStart.rich_text[0].plain_text : "20:00",
      end: quietEnd?.type === "rich_text" && quietEnd.rich_text[0] ? quietEnd.rich_text[0].plain_text : "06:00",
      tz: quietTz?.type === "rich_text" && quietTz.rich_text[0] ? quietTz.rich_text[0].plain_text : "America/New_York",
      allow: Array.from(allowTopics)
    },
    telegram: {
      chatIdExec: telegramChatId?.type === "number" ? telegramChatId.number ?? undefined : undefined,
      topics: telegramTopicMap,
      commands
    },
    webhooks,
    stripe: {
      plan: stripePlan?.type === "rich_text" && stripePlan.rich_text[0] ? stripePlan.rich_text[0].plain_text : "single",
      tier: stripeTier?.type === "rich_text" && stripeTier.rich_text[0] ? stripeTier.rich_text[0].plain_text : "default",
      webhookSecret: stripeWebhook?.type === "rich_text" && stripeWebhook.rich_text[0] ? stripeWebhook.rich_text[0].plain_text : undefined
    },
    urls: {
      ganttPublicUrl: ganttUrl?.type === "url" ? ganttUrl.url ?? undefined : undefined,
      dashboardBaseUrl: dashboardUrl?.type === "url" ? dashboardUrl.url ?? undefined : undefined
    },
    updatedAt: new Date(page.last_edited_time),
    createdAt: "created_time" in page ? new Date(page.created_time) : new Date(),
    notionPageId: page.id
  });
}

function buildAdminSettingsProperties(settings: AdminSettings): Record<string, unknown> {
  return {
    "Feature Flags": {
      multi_select: Object.entries(settings.featureFlags).filter(([, value]) => value).map(([key]) => ({ name: key }))
    },
    "Quiet Start": {
      rich_text: [{ text: { content: settings.quietHours.start } }]
    },
    "Quiet End": {
      rich_text: [{ text: { content: settings.quietHours.end } }]
    },
    "Quiet TZ": {
      rich_text: [{ text: { content: settings.quietHours.tz } }]
    },
    "Quiet Allow": {
      multi_select: settings.quietHours.allow.map((topic) => ({ name: topic }))
    },
    "Telegram Topics": {
      multi_select: Object.entries(settings.telegram.topics).map(([key, value]) => ({ name: `${key}:${value}` }))
    },
    "Telegram Commands": {
      multi_select: settings.telegram.commands.map((command) => ({ name: command }))
    },
    "Telegram Chat": {
      number: settings.telegram.chatIdExec ?? null
    },
    "Webhooks": {
      rich_text: Object.entries(settings.webhooks).map(([key, url]) => ({ text: { content: `${key}=${url}` } }))
    },
    "Stripe Plan": {
      rich_text: [{ text: { content: settings.stripe.plan } }]
    },
    "Stripe Tier": {
      rich_text: [{ text: { content: settings.stripe.tier } }]
    },
    "Stripe Webhook": settings.stripe.webhookSecret ? {
      rich_text: [{ text: { content: settings.stripe.webhookSecret } }]
    } : { rich_text: [] },
    "Gantt URL": {
      url: settings.urls.ganttPublicUrl ?? null
    },
    "Dashboard URL": {
      url: settings.urls.dashboardBaseUrl ?? null
    }
  };
}
