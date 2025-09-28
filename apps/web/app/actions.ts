"use server";

import { revalidatePath } from "next/cache";

const API_BASE_URL = process.env.EXECSUITE_API_URL ?? process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN;

if (!ADMIN_TOKEN) {
  console.warn("ADMIN_API_TOKEN not set. Server actions will fail for protected routes.");
}

async function apiFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
      "x-admin-token": ADMIN_TOKEN ?? ""
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "unknown" }));
    throw new Error(`API error: ${response.status} ${JSON.stringify(error)}`);
  }
  return response.json();
}

export async function checkInAction(formData: FormData) {
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const accuracyMeters = formData.get("accuracyMeters") ? Number(formData.get("accuracyMeters")) : undefined;

  const result = await apiFetch("/api/checkin", {
    method: "POST",
    body: JSON.stringify({ latitude, longitude, accuracyMeters })
  });

  revalidatePath("/");
  return result;
}

export async function buildLookAheadAction(formData: FormData) {
  const weekStartIso = formData.get("weekStartIso") as string;
  const projectId = formData.get("projectId") as string | null;
  const idempotencyKey = formData.get("idempotencyKey") as string;

  const result = await apiFetch("/api/lookahead/build", {
    method: "POST",
    body: JSON.stringify({ weekStartIso, projectId: projectId || undefined, idempotencyKey })
  });

  revalidatePath("/");
  return result;
}

export async function renderGanttAction(payload: { title: string; weekStartIso: string; rows: any[]; persistToConfig?: boolean }) {
  const result = await apiFetch("/api/gantt/render", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  revalidatePath("/");
  return result;
}

export async function registerTelegramCommandsAction() {
  return apiFetch("/api/telegram/register-commands", { method: "POST" });
}

export async function smokeWebhooksAction() {
  return apiFetch("/api/smoke", { method: "POST" });
}

export async function ingestPlanAction(formData: FormData) {
  const projectId = formData.get("projectId") as string;
  const notes = formData.get("notes") as string | null;
  const file = formData.get("file") as File | null;

  if (!file) {
    throw new Error("File is required");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileBase64 = buffer.toString("base64");

  const result = await apiFetch("/api/ingest/plan", {
    method: "POST",
    body: JSON.stringify({
      projectId,
      filename: file.name,
      fileBase64,
      notes: notes ?? undefined
    })
  });

  revalidatePath("/");
  return result;
}

export async function searchElementsAction(params: { type?: string; projectId?: string; q?: string }) {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set("type", params.type);
  if (params.projectId) searchParams.set("projectId", params.projectId);
  if (params.q) searchParams.set("q", params.q);

  const response = await fetch(`${API_BASE_URL}/api/elements/search?${searchParams.toString()}`, {
    headers: {
      "x-admin-token": ADMIN_TOKEN ?? ""
    }
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  return response.json();
}
