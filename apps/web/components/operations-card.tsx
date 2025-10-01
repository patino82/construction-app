"use client";

import * as React from "react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@execsuite/ui";
import { registerTelegramCommandsAction, smokeWebhooksAction } from "../app/actions";

export function OperationsCard() {
  const [message, setMessage] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operations Control</CardTitle>
        <CardDescription>Telegram routing & integration smoke checks.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                await registerTelegramCommandsAction();
                setMessage("Telegram commands refreshed");
              } catch (error) {
                setMessage((error as Error).message);
              }
            })
          }
        >
          Register Telegram Commands
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                const result = await smokeWebhooksAction();
                const summary = result.results.map((item: any) => `${item.name}:${item.ok ? "OK" : "FAIL"}`).join(", ");
                setMessage(summary);
              } catch (error) {
                setMessage((error as Error).message);
              }
            })
          }
        >
          Run Integration Smoke Test
        </Button>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
