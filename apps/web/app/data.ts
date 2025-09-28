const API_BASE_URL = process.env.EXECSUITE_API_URL ?? process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN ?? process.env.NEXT_PUBLIC_ADMIN_TOKEN;

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "x-admin-token": ADMIN_TOKEN ?? "",
      "content-type": "application/json"
    },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }
  return response.json() as Promise<T>;
}

export async function getProjects() {
  return fetchJson<{ projects: any[] }>("/api/projects");
}

export async function searchElements(params: URLSearchParams) {
  const path = `/api/elements/search?${params.toString()}`;
  return fetchJson<{ elements: any[] }>(path, { headers: { "x-admin-token": ADMIN_TOKEN ?? "" } });
}

export async function getAdminSettings() {
  return fetchJson("/api/config", { method: "GET" }).catch(() => null);
}
