import type { Logger } from "pino";
import { DailyLog, DailyLogSchema } from "../schemas/dailyLog";
import { NotionService } from "./notionService";
import { withRetry } from "../utils/retry";

export interface DailyLogServiceOptions {
  notion: NotionService;
  dailyLogsDatabaseId: string;
  logger?: Logger;
}

export interface CheckInPayload {
  projectId: string;
  gps: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };
  timestamp?: Date;
}

export class DailyLogService {
  private readonly notion: NotionService;
  private readonly dailyLogsDatabaseId: string;
  private readonly logger?: Logger;

  constructor(options: DailyLogServiceOptions) {
    this.notion = options.notion;
    this.dailyLogsDatabaseId = options.dailyLogsDatabaseId;
    this.logger = options.logger;
  }

  async getOrCreateDailyLog(projectId: string, date: Date): Promise<DailyLog> {
    const isoDate = date.toISOString().slice(0, 10);

    const existing = await withRetry(() =>
      this.notion.rawClient.databases.query({
        database_id: this.dailyLogsDatabaseId,
        filter: {
          and: [
            { property: "Log Date", date: { equals: isoDate } },
            { property: "Project", relation: { contains: projectId } }
          ]
        },
        page_size: 1
      })
    );

    const match = existing.results[0];
    if (match) {
      return mapNotionDailyLog(match);
    }

    const pageId = await this.notion.upsertByUniqueRichText(
      this.dailyLogsDatabaseId,
      "Idempotency Key",
      `${projectId}:${isoDate}`,
      () => ({
        Name: {
          title: [{ text: { content: `Daily Log :: ${isoDate}` } }]
        },
        Project: {
          relation: [{ id: projectId }]
        },
        "Log Date": {
          date: { start: isoDate }
        },
        "Idempotency Key": {
          rich_text: [{ text: { content: `${projectId}:${isoDate}` } }]
        }
      })
    );

    return DailyLogSchema.parse({
      id: pageId,
      date,
      projectId,
      notes: "",
      weather: undefined,
      manpowerCount: 0,
      issues: [],
      gpsCheckins: [],
      notionPageId: pageId,
      createdAt: date,
      updatedAt: new Date()
    });
  }

  async addCheckIn(log: DailyLog, payload: CheckInPayload): Promise<DailyLog> {
    const timestamp = payload.timestamp ?? new Date();
    const updatedCheckins = [...log.gpsCheckins, { ...payload.gps, timestamp }];

    await this.notion.upsertByUniqueRichText(
      this.dailyLogsDatabaseId,
      "Idempotency Key",
      `${payload.projectId}:${log.date.toISOString().slice(0, 10)}`,
      () => ({
        "GPS Checkins": {
          rich_text: [{ text: { content: JSON.stringify(updatedCheckins) } }]
        },
        "Last Checkin": {
          date: { start: timestamp.toISOString() }
        },
        Project: {
          relation: [{ id: payload.projectId }]
        },
        "Log Date": {
          date: { start: log.date.toISOString().slice(0, 10) }
        },
        "Idempotency Key": {
          rich_text: [{ text: { content: `${payload.projectId}:${log.date.toISOString().slice(0, 10)}` } }]
        }
      })
    );

    const mutated = {
      ...log,
      gpsCheckins: updatedCheckins,
      updatedAt: timestamp
    };

    return DailyLogSchema.parse(mutated);
  }
}

function mapNotionDailyLog(page: any): DailyLog {
  if (!("properties" in page)) {
    throw new Error("Invalid Notion daily log payload");
  }

  const dateProp = page.properties["Log Date"];
  const projectProp = page.properties["Project"];
  const notesProp = page.properties["Notes"];
  const weatherProp = page.properties["Weather"];
  const manpowerProp = page.properties["Manpower"];
  const issuesProp = page.properties["Issues"];
  const gpsProp = page.properties["GPS Checkins"];

  return DailyLogSchema.parse({
    id: page.id,
    date: dateProp?.type === "date" && dateProp.date?.start ? new Date(dateProp.date.start) : new Date(),
    projectId: projectProp?.type === "relation" && projectProp.relation[0] ? projectProp.relation[0].id : "",
    notes: notesProp?.type === "rich_text" && notesProp.rich_text[0] ? notesProp.rich_text[0].plain_text : undefined,
    weather: weatherProp?.type === "rich_text" && weatherProp.rich_text[0] ? weatherProp.rich_text[0].plain_text : undefined,
    manpowerCount: manpowerProp?.type === "number" && typeof manpowerProp.number === "number" ? manpowerProp.number : 0,
    issues: issuesProp?.type === "multi_select" ? issuesProp.multi_select.map((option: { name: string }) => option.name) : [],
    gpsCheckins: gpsProp?.type === "rich_text" && gpsProp.rich_text[0] ? safeGps(gpsProp.rich_text[0].plain_text) : [],
    notionPageId: page.id,
    updatedAt: new Date(page.last_edited_time),
    createdAt: "created_time" in page ? new Date(page.created_time) : new Date()
  });
}

function safeGps(value: string): Array<{ timestamp: Date; latitude: number; longitude: number; accuracyMeters?: number }> {
  try {
    const parsed = JSON.parse(value);
    return parsed.map((entry: any) => ({
      ...entry,
      timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date()
    }));
  } catch {
    return [];
  }
}
