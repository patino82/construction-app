"use client";

import * as React from "react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@execsuite/ui";
import { ProjectSelect } from "./project-select";
import { searchElementsAction } from "../app/actions";

interface ElementQueryCardProps {
  projects: Array<{ id: string; name: string; slug: string }>;
}

export function ElementQueryCard({ projects }: ElementQueryCardProps) {
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<any[]>([]);
  const [message, setMessage] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Element Q&A</CardTitle>
        <CardDescription>Query extracted elements with natural language hints.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              try {
                const response = await searchElementsAction({
                  type: formData.get("type") as string | undefined,
                  projectId: formData.get("projectId") as string | undefined,
                  q: formData.get("q") as string | undefined
                });
                setResult(response.elements ?? []);
                setMessage(`Found ${response.elements?.length ?? 0} elements`);
              } catch (error) {
                setMessage((error as Error).message);
              }
            });
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-sm font-medium text-slate-600">
              Element Type
              <select
                name="type"
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
                defaultValue="wall"
              >
                <option value="wall">Wall</option>
                <option value="door">Door</option>
                <option value="base_cabinet">Base Cabinet</option>
                <option value="note">Note</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-600">
              Project
              <ProjectSelect name="projectId" projects={projects} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Search Phrase
              <input
                name="q"
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
                placeholder="How long is wall W3 on sheet A1.2?"
              />
            </label>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Searching…" : "Search"}
          </Button>
        </form>
        {message ? <p className="mt-4 text-sm text-slate-600">{message}</p> : null}
        {result.length ? (
          <div className="mt-4 space-y-2">
            {result.slice(0, 5).map((element) => (
              <div key={element.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <div className="font-medium">{element.identifier}</div>
                <div className="text-xs text-slate-500">Sheet {element.sheetRef ?? "n/a"} · Confidence {(element.confidence * 100).toFixed(0)}%</div>
                <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs text-slate-600">
                  {JSON.stringify(element.attributesJson, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
