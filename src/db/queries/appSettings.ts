import { getDb } from "@/db/client";

export type AppSettingsMap = Record<string, string>;

export async function getAppSettings(): Promise<AppSettingsMap> {
  const db = await getDb();
  const rows = await db.select<{ key: string; value: string }[]>(
    "SELECT key, value FROM app_settings",
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getAppSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM app_settings WHERE key = $1",
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function upsertAppSetting(
  key: string,
  value: string,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ($1, $2, datetime('now'))",
    [key, value],
  );
}
