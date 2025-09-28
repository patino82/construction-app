"use client";

import * as React from "react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@execsuite/ui";
import { ProjectSelect } from "./project-select";
import { ingestPlanAction } from "../app/actions";

interface PlanIngestCardProps {
  projects: Array<{ id: string; name: string; slug: string }>;
}

export function PlanIngestCard({ projects }: PlanIngestCardProps) {
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan / PO Upload</CardTitle>
        <CardDescription>Upload new plan sets and auto-extract elements.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          className="space-y-4"
          action={(formData) =>
            startTransition(async () => {
              try {
                const result = await ingestPlanAction(formData);
                setMessage(`Captured ${result.elements.length} elements`);
                formRef.current?.reset();
              } catch (error) {
                setMessage((error as Error).message);
              }
            })
          }
        >
          <label className="block text-sm font-medium text-slate-600">
            Project
            <ProjectSelect name="projectId" projects={projects} allowAll={false} />
          </label>
          <label className="block text-sm font-medium text-slate-600">
            Plan / PO File (PDF)
            <input
              required
              name="file"
              type="file"
              accept="application/pdf"
              className="mt-1 block w-full rounded-md border border-dashed border-slate-300 p-3 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-slate-600">
            Notes
            <textarea
              name="notes"
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
              placeholder="Special instructions"
            />
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? "Processing…" : "Upload & Extract"}
          </Button>
        </form>
        {message ? <p className="mt-4 text-sm text-slate-600">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
