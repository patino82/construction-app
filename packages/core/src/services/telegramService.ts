import { Bot, GrammyError, HttpError } from "grammy";
import type { Logger } from "pino";
import { AdminSettings } from "../schemas/adminSettings";
import { isWithinQuietHours, shouldBypassQuietHours } from "../utils/quietHours";

export interface TelegramServiceOptions {
  botToken: string;
  settings: AdminSettings;
  logger?: Logger;
}

export class TelegramService {
  private readonly bot: Bot | null;
  private settings: AdminSettings;
  private readonly logger?: Logger;

  constructor(options: TelegramServiceOptions) {
    this.settings = options.settings;
    this.logger = options.logger;
    this.bot = options.botToken ? new Bot(options.botToken) : null;
  }

  updateSettings(settings: AdminSettings): void {
    this.settings = settings;
  }

  async registerCommands(): Promise<void> {
    if (!this.bot) return;
    const commands = this.settings.telegram.commands.map((command) => ({
      command: command.replace("/", ""),
      description: `${command.replace("/", "")} command`
    }));

    await this.bot.api.setMyCommands(commands);
    this.logger?.info({ commands }, "Telegram commands registered");
  }

  async sendTopicMessage(topic: string, message: string): Promise<void> {
    if (!this.bot) return;
    const quietHours = this.settings.quietHours;

    if (isWithinQuietHours(quietHours) && !shouldBypassQuietHours(quietHours, topic)) {
      this.logger?.info({ topic }, "Quiet hours active; message suppressed");
      return;
    }

    const topicId = this.settings.telegram.topics[topic];
    if (!topicId) {
      this.logger?.warn({ topic }, "Unknown Telegram topic");
      return;
    }

    const chatId = this.settings.telegram.chatIdExec;
    if (!chatId) {
      this.logger?.warn("Telegram chat ID missing");
      return;
    }

    try {
      await this.bot.api.sendMessage(chatId, message, { message_thread_id: topicId });
    } catch (error) {
      if (error instanceof GrammyError || error instanceof HttpError) {
        this.logger?.error({ error }, "Telegram API error");
      } else {
        this.logger?.error({ error }, "Unexpected Telegram error");
      }
    }
  }
}
