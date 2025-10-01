import sharp from "sharp";
import type { Logger } from "pino";
import { LookAheadRow } from "../schemas/lookAhead";

export interface GanttStorageAdapter {
  putObject(params: { key: string; contentType: string; data: Buffer }): Promise<string>;
}

export interface GanttRenderOptions {
  title: string;
  weekOf: string;
  width?: number;
  height?: number;
}

export interface GanttServiceOptions {
  storageAdapter?: GanttStorageAdapter;
  logger?: Logger;
}

export interface GanttRenderResult {
  buffer: Buffer;
  contentType: string;
  url: string;
}

export class GanttService {
  private readonly storageAdapter?: GanttStorageAdapter;
  private readonly logger?: Logger;

  constructor(options: GanttServiceOptions = {}) {
    this.storageAdapter = options.storageAdapter;
    this.logger = options.logger;
  }

  async render(rows: LookAheadRow[], options: GanttRenderOptions): Promise<GanttRenderResult> {
    const width = options.width ?? 1600;
    const height = options.height ?? Math.max(600, 120 + rows.length * 60);

    const svg = this.renderSvg(rows, options, width, height);
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();

    if (!this.storageAdapter) {
      const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
      return { buffer, contentType: "image/png", url: dataUrl };
    }

    const key = `gantt/${options.weekOf}/${Date.now()}.png`;
    const url = await this.storageAdapter.putObject({ key, contentType: "image/png", data: buffer });

    this.logger?.info({ key, url }, "Gantt PNG rendered and stored");
    return { buffer, contentType: "image/png", url };
  }

  private renderSvg(rows: LookAheadRow[], options: GanttRenderOptions, width: number, height: number): string {
    const headerHeight = 120;
    const rowHeight = 48;
    const chartWidth = width - 200;
    const dayWidth = chartWidth / 21; // 3 week look-ahead
    const startX = 180;

    const today = new Date();

    const rowSvgs = rows.map((row, index) => {
      const y = headerHeight + index * rowHeight;
      const bar = this.buildBar(row, startX, y + 12, dayWidth);

      return `
        <g>
          <text x="16" y="${y + 24}" font-size="16" font-family="Inter, sans-serif" fill="#1f2937">${escapeSvg(row.project)}</text>
          <text x="90" y="${y + 24}" font-size="14" font-family="Inter, sans-serif" fill="#4b5563">${escapeSvg(row.task)}</text>
          ${bar}
          <line x1="16" x2="${width - 32}" y1="${y + rowHeight}" y2="${y + rowHeight}" stroke="#e5e7eb" stroke-width="1" />
        </g>
      `;
    }).join("\n");

    const todayX = startX + diffDays(options.weekOf, today.toISOString()) * dayWidth;

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          @font-face {
            font-family: 'Inter';
            font-style: normal;
            font-weight: 400;
            src: local('Inter');
          }
        </style>
        <rect width="100%" height="100%" fill="#f9fafb" />
        <text x="16" y="48" font-size="32" font-family="Inter, sans-serif" fill="#111827" font-weight="600">${escapeSvg(options.title)}</text>
        <text x="16" y="82" font-size="18" font-family="Inter, sans-serif" fill="#4b5563">Week of ${escapeSvg(options.weekOf)}</text>
        <line x1="16" x2="${width - 32}" y1="96" y2="96" stroke="#d1d5db" stroke-width="2" />
        ${renderTimeline(startX, headerHeight - 24, chartWidth, dayWidth)}
        <line x1="${todayX}" x2="${todayX}" y1="${headerHeight}" y2="${height - 32}" stroke="#ef4444" stroke-width="2" stroke-dasharray="4" />
        ${rowSvgs}
      </svg>
    `;
  }

  private buildBar(row: LookAheadRow, xOffset: number, y: number, dayWidth: number): string {
    if (!row.startDate || !row.finishDate) {
      return `<text x="${xOffset}" y="${y + 16}" font-size="14" fill="#9ca3af">No schedule</text>`;
    }

    const start = new Date(row.startDate);
    const end = new Date(row.finishDate);
    const startOffsetDays = diffDays(row.weekStartIso, start.toISOString());
    const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const x = xOffset + startOffsetDays * dayWidth;
    const width = Math.max(dayWidth, durationDays * dayWidth);

    const color = colorByTrade(row.trade ?? "GENERAL");

    return `
      <rect x="${x}" y="${y}" width="${width}" height="24" rx="6" fill="${color}" opacity="0.85" />
      <text x="${x + 12}" y="${y + 16}" font-size="14" font-family="Inter, sans-serif" fill="#1f2937">${escapeSvg(row.trade ?? "General")}</text>
    `;
  }
}

function renderTimeline(startX: number, y: number, chartWidth: number, dayWidth: number): string {
  const labels: string[] = [];
  for (let day = 0; day <= 21; day += 7) {
    const x = startX + day * dayWidth;
    labels.push(`<text x="${x}" y="${y}" font-size="12" fill="#6b7280">+${day}d</text>`);
  }
  return labels.join("\n");
}

function diffDays(startIso: string, compareIso: string): number {
  const start = new Date(startIso);
  const compare = new Date(compareIso);
  const diff = compare.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function colorByTrade(trade: string): string {
  const palette: Record<string, string> = {
    ELECTRICAL: "#fbbf24",
    HVAC: "#34d399",
    PLUMBING: "#60a5fa",
    STRUCTURE: "#f472b6",
    GENERAL: "#a78bfa"
  };
  return palette[trade.toUpperCase()] ?? "#60a5fa";
}

function escapeSvg(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
