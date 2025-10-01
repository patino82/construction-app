import { Client, isFullPage } from "@notionhq/client";
import type { Logger } from "pino";
import { withRetry } from "../utils/retry";

export interface NotionServiceOptions {
  auth: string;
  notionVersion?: string;
  logger?: Logger;
  defaultPageSize?: number;
}

export type NotionPageMapper<T> = (page: Awaited<ReturnType<Client["pages"]["retrieve"]>>) => T;

export class NotionService {
  private readonly client: Client;
  private readonly logger?: Logger;
  private readonly defaultPageSize: number;

  constructor(options: NotionServiceOptions) {
    this.client = new Client({ auth: options.auth, notionVersion: options.notionVersion });
    this.logger = options.logger;
    this.defaultPageSize = options.defaultPageSize ?? 50;
  }

  async listDatabase<T>(databaseId: string, mapper: NotionPageMapper<T>, query?: Parameters<Client["databases"]["query"]>[0]): Promise<T[]> {
    const results: T[] = [];
    let cursor: string | undefined;

    do {
      const response = await withRetry(() => this.client.databases.query({
        database_id: databaseId,
        start_cursor: cursor,
        page_size: this.defaultPageSize,
        ...query
      }));

      response.results.forEach((item) => {
        if (isFullPage(item)) {
          results.push(mapper(item));
        }
      });

      cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);

    return results;
  }

  async findFirstByProperty<T>(databaseId: string, property: string, value: string, mapper: NotionPageMapper<T>): Promise<T | null> {
    const matches = await this.client.databases.query({
      database_id: databaseId,
      filter: {
        property,
        rich_text: {
          equals: value
        }
      },
      page_size: 1
    });

    const page = matches.results.find(isFullPage);
    return page ? mapper(page) : null;
  }

  async upsertByUniqueRichText(databaseId: string, property: string, value: string, buildProperties: () => Record<string, unknown>): Promise<string> {
    const existing = await this.client.databases.query({
      database_id: databaseId,
      filter: {
        property,
        rich_text: {
          equals: value
        }
      },
      page_size: 1
    });

    const page = existing.results.find(isFullPage);
    const properties = buildProperties();

    if (page) {
      await withRetry(() => this.client.pages.update({
        page_id: page.id,
        properties
      }));
      this.logger?.debug({ databaseId, property, value }, "Updated Notion page via idempotent upsert");
      return page.id;
    }

    const created = await withRetry(() => this.client.pages.create({
      parent: { database_id: databaseId },
      properties
    }));
    this.logger?.debug({ databaseId, property, value }, "Created Notion page via idempotent upsert");
    return created.id;
  }

  async appendBlockChildren(blockId: string, children: Parameters<Client["blocks"]["children"]["append"]>[0]["children"]): Promise<void> {
    await withRetry(() => this.client.blocks.children.append({
      block_id: blockId,
      children
    }));
  }

  get rawClient(): Client {
    return this.client;
  }
}
