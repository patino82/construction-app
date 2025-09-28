import type { Logger } from "pino";
import { LookAheadRow, LookAheadRowSchema } from "../schemas/lookAhead";
import { Task, TaskSchema } from "../schemas/task";
import { NotionService } from "./notionService";

export interface LookAheadServiceOptions {
  notion: NotionService;
  tasksDatabaseId: string;
  lookaheadDatabaseId: string;
  logger?: Logger;
}

export interface BuildLookAheadOptions {
  weekStartIso: string;
  projectId?: string;
  idempotencyKey: string;
}

export class LookAheadService {
  private readonly notion: NotionService;
  private readonly tasksDatabaseId: string;
  private readonly lookaheadDatabaseId: string;
  private readonly logger?: Logger;

  constructor(options: LookAheadServiceOptions) {
    this.notion = options.notion;
    this.tasksDatabaseId = options.tasksDatabaseId;
    this.lookaheadDatabaseId = options.lookaheadDatabaseId;
    this.logger = options.logger;
  }

  async buildLookAhead(options: BuildLookAheadOptions): Promise<LookAheadRow[]> {
    const tasks = await this.fetchTasks();
    const rows: LookAheadRow[] = [];

    for (const task of tasks) {
      if (options.projectId && task.projectId !== options.projectId) continue;

      const row = LookAheadRowSchema.parse({
        id: `${task.id}-${options.weekStartIso}`,
        weekStartIso: options.weekStartIso,
        project: task.projectId,
        task: task.name,
        trade: task.trade,
        owner: task.owner,
        startDate: task.startDate,
        finishDate: task.finishDate,
        needBy: task.needBy,
        priority: task.priority as LookAheadRow["priority"],
        status: mapTaskStatus(task.status),
        scheduleJson: task.scheduleJson,
        idempotencyKey: options.idempotencyKey,
        notionPageId: task.notionPageId,
        createdAt: task.createdAt,
        updatedAt: new Date()
      });

      await this.persistRow(row);
      rows.push(row);
    }

    return rows;
  }

  private async fetchTasks(): Promise<Task[]> {
    return this.notion.listDatabase<Task>(this.tasksDatabaseId, mapNotionTask);
  }

  private async persistRow(row: LookAheadRow): Promise<void> {
    const properties = {
      Name: {
        title: [{ text: { content: `${row.project} :: ${row.task}` } }]
      },
      "Week Start": {
        date: { start: row.weekStartIso }
      },
      Status: {
        select: { name: row.status }
      },
      Priority: {
        select: { name: row.priority }
      },
      Project: {
        relation: [{ id: row.project }]
      },
      "Task Ref": {
        relation: [{ id: row.notionPageId }]
      },
      Owner: row.owner ? {
        rich_text: [{ text: { content: row.owner } }]
      } : undefined,
      Trade: row.trade ? {
        rich_text: [{ text: { content: row.trade } }]
      } : undefined,
      Schedule: {
        rich_text: [{ text: { content: JSON.stringify(row.scheduleJson) } }]
      },
      "Idempotency Key": {
        rich_text: [{ text: { content: row.idempotencyKey } }]
      }
    };

    await this.notion.upsertByUniqueRichText(
      this.lookaheadDatabaseId,
      "Idempotency Key",
      row.idempotencyKey,
      () => properties
    );
  }
}

function mapNotionTask(page: any): Task {
  if (!("properties" in page)) {
    throw new Error("Invalid Notion task payload");
  }

  const nameProp = page.properties["Name"];
  const projectProp = page.properties["Project"];
  const stageProp = page.properties["Stage"];
  const sequenceProp = page.properties["Sequence"];
  const tradeProp = page.properties["Trade"];
  const ownerProp = page.properties["Owner"];
  const startProp = page.properties["Start"];
  const finishProp = page.properties["Finish"];
  const needByProp = page.properties["Need By"];
  const statusProp = page.properties["Status"];
  const priorityProp = page.properties["Priority"];
  const scheduleProp = page.properties["Schedule"];
  const idempotencyProp = page.properties["Idempotency Key"];

  return TaskSchema.parse({
    id: page.id,
    name: nameProp?.type === "title" && nameProp.title[0] ? nameProp.title[0].plain_text : page.id,
    projectId: projectProp?.type === "relation" && projectProp.relation[0] ? projectProp.relation[0].id : "",
    stage: stageProp?.type === "select" && stageProp.select ? stageProp.select.name : "",
    sequence: sequenceProp?.type === "number" && sequenceProp.number ? sequenceProp.number : 0,
    trade: tradeProp?.type === "rich_text" && tradeProp.rich_text[0] ? tradeProp.rich_text[0].plain_text : undefined,
    owner: ownerProp?.type === "rich_text" && ownerProp.rich_text[0] ? ownerProp.rich_text[0].plain_text : undefined,
    startDate: startProp?.type === "date" && startProp.date?.start ? new Date(startProp.date.start) : null,
    finishDate: finishProp?.type === "date" && finishProp.date?.start ? new Date(finishProp.date.start) : null,
    needBy: needByProp?.type === "date" && needByProp.date?.start ? new Date(needByProp.date.start) : null,
    status: statusProp?.type === "select" && statusProp.select ? statusProp.select.name.toLowerCase() : "pending",
    scheduleJson: scheduleProp?.type === "rich_text" && scheduleProp.rich_text[0]
      ? safeJson(scheduleProp.rich_text[0].plain_text)
      : {},
    priority: priorityProp?.type === "select" && priorityProp.select ? priorityProp.select.name.toLowerCase() : "medium",
    idempotencyKey: idempotencyProp?.type === "rich_text" && idempotencyProp.rich_text[0]
      ? idempotencyProp.rich_text[0].plain_text
      : `${page.id}-idempotent`,
    notionPageId: page.id,
    updatedAt: new Date(page.last_edited_time),
    createdAt: "created_time" in page ? new Date(page.created_time) : new Date()
  });
}

function mapTaskStatus(status: Task["status"]): LookAheadRow["status"] {
  switch (status) {
    case "complete":
      return "done";
    case "blocked":
    case "hold":
      return "at_risk";
    case "in_progress":
      return "committed";
    default:
      return "planned";
  }
}

function safeJson(value: string | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
