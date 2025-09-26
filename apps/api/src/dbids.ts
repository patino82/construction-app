import env from "./env";

const overrideFromEnv = (key: string, fallback: string): string => {
  const envKey = process.env[`NOTION_${key}`];
  return envKey ?? fallback;
};

export const DBIDS = {
  ADMIN_SETTINGS: overrideFromEnv("DBID_ADMIN_SETTINGS", "2718b7ee283b80939b7cd5d080804e4c"),
  PROJECTS: overrideFromEnv("DBID_PROJECTS", "2608b7ee283b8080b2fed4ea9e15e2f3"),
  TASKS: overrideFromEnv("DBID_TASKS", "2608b7ee283b80e1b7d4d05719293505"),
  DAILY_LOGS: overrideFromEnv("DBID_DAILY_LOGS", "2608b7ee283b805793aaccb78b9ca7db"),
  PLANS: overrideFromEnv("DBID_PLANS", "2504a72e226a80588464d4a8f5ab8bc3"),
  ELEMENTS: overrideFromEnv("DBID_ELEMENTS", "2504a72e226a80588464d4a8f5ab8bc3"),
  LOOKAHEAD: overrideFromEnv("DBID_LOOKAHEAD", "2608b7ee283b80e1b7d4d05719293505")
} as const;

export type DatabaseKey = keyof typeof DBIDS;

export function assertEnv(): void {
  if (!env.NOTION_TOKEN) {
    throw new Error("NOTION_TOKEN is required");
  }
}
