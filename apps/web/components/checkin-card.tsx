"use client";

import * as React from "react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@execsuite/ui";
import { checkInAction } from "../app/actions";

export function CheckInCard() {
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<null | { project: { name: string }; distanceMeters: number }>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>GPS Check-In</CardTitle>
        <CardDescription>Validate crews are on-site and auto-open today&apos;s daily log.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          className="space-y-3"
          action={(formData) =>
            startTransition(async () => {
              const payload = new FormData(formRef.current ?? undefined);
              payload.set("latitude", formData.get("latitude") as string);
              payload.set("longitude", formData.get("longitude") as string);
              const response = await checkInAction(payload);
              setResult(response);
              formRef.current?.reset();
            })
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-600">
              Latitude
              <input
                required
                name="latitude"
                type="number"
                step="0.000001"
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
                placeholder="40.7128"
              />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Longitude
              <input
                required
                name="longitude"
                type="number"
                step="0.000001"
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
                placeholder="-74.0060"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-600">
            Accuracy (m)
            <input
              name="accuracyMeters"
              type="number"
              step="0.1"
              className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
              placeholder="5"
            />
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? "Checking in…" : "Check In"}
          </Button>
        </form>
        {result ? (
          <p className="mt-4 text-sm text-emerald-600">
            {result.project.name} acknowledged · {result.distanceMeters.toFixed(1)}m from center
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
