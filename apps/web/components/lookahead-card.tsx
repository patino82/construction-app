"use client";

import * as React from "react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@execsuite/ui";
import { ProjectSelect } from "./project-select";
import { buildLookAheadAction, renderGanttAction } from "../app/actions";

interface LookAheadCardProps {
  projects: Array<{ id: string; name: string; slug: string }>;
}

export function LookAheadCard({ projects }: LookAheadCardProps) {
  const [pending, startTransition] = React.useTransition();
  const [rows, setRows] = React.useState<any[]>([]);
  const [message, setMessage] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>3-Week Look-Ahead</CardTitle>
        <CardDescription>Build and publish updated look-ahead from Task DB.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          className="space-y-4"
          action={(formData) =>
            startTransition(async () => {
              const generatedKey = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
              formData.set("idempotencyKey", generatedKey);
              const result = await buildLookAheadAction(formData);
              setRows(result.rows);
              setMessage(`Generated ${result.rows.length} rows`);
            })
          }
        >
          <input type="hidden" name="idempotencyKey" />
          <label className="block text-sm font-medium text-slate-600">
            Week Start (ISO)
            <input
              required
              name="weekStartIso"
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-slate-600">
            Project
            <ProjectSelect name="projectId" projects={projects} />
          </label>
          <div className="flex items-center space-x-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Building…" : "Build Look-Ahead"}
            </Button>
            {rows.length ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const weekStartInput = formRef.current?.querySelector<HTMLInputElement>("input[name=weekStartIso]");
                    const weekStartIso = weekStartInput?.value;
                    if (!weekStartIso) return;
                    await renderGanttAction({
                      title: `3WLA :: ${weekStartIso}`,
                      weekStartIso,
                      rows,
                      persistToConfig: true
                    });
                    setMessage("Gantt rendered & URL persisted");
                  })
                }
              >
                Render Gantt & Persist URL
              </Button>
            ) : null}
          </div>
        </form>
        {message ? <p className="mt-4 text-sm text-slate-600">{message}</p> : null}
      </CardContent>
      {rows.length ? (
        <CardFooter>
          <div className="w-full overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-2 py-1 text-left">Task</th>
                  <th className="px-2 py-1 text-left">Trade</th>
                  <th className="px-2 py-1 text-left">Start</th>
                  <th className="px-2 py-1 text-left">Finish</th>
                  <th className="px-2 py-1 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.slice(0, 5).map((row) => (
                  <tr key={row.id}>
                    <td className="px-2 py-1 font-medium text-slate-700">{row.task}</td>
                    <td className="px-2 py-1 text-slate-500">{row.trade ?? "—"}</td>
                    <td className="px-2 py-1 text-slate-500">{row.startDate ? new Date(row.startDate).toLocaleDateString() : "—"}</td>
                    <td className="px-2 py-1 text-slate-500">{row.finishDate ? new Date(row.finishDate).toLocaleDateString() : "—"}</td>
                    <td className="px-2 py-1 text-slate-500">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}
