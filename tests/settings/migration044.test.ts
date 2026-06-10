// @vitest-environment node

import { describe, it, expect } from "vitest";
import { createHobbyforgeDb } from "../data-layer/db-helpers";

describe("migration 044 — app_settings table", () => {
  it("app_settings table exists after migration chain", () => {
    const db = createHobbyforgeDb();
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='app_settings'",
      )
      .get() as { name: string } | undefined;
    db.close();

    expect(row?.name).toBe("app_settings");
  });

  it("app_settings has key, value, updated_at columns", () => {
    const db = createHobbyforgeDb();
    const columns = db
      .prepare("PRAGMA table_info(app_settings)")
      .all() as { name: string }[];
    db.close();

    const names = columns.map((c) => c.name);
    expect(names).toContain("key");
    expect(names).toContain("value");
    expect(names).toContain("updated_at");
  });

  it("key is PRIMARY KEY", () => {
    const db = createHobbyforgeDb();
    const columns = db
      .prepare("PRAGMA table_info(app_settings)")
      .all() as { name: string; pk: number }[];
    db.close();

    const keyCol = columns.find((c) => c.name === "key");
    expect(keyCol?.pk).toBe(1);
  });

  it("INSERT OR REPLACE upsert works — only one row with updated value", () => {
    const db = createHobbyforgeDb();

    db.prepare(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('theme', 'light')",
    ).run();
    db.prepare(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('theme', 'dark')",
    ).run();

    const rows = db
      .prepare("SELECT key, value FROM app_settings WHERE key = 'theme'")
      .all() as { key: string; value: string }[];
    db.close();

    expect(rows).toHaveLength(1);
    expect(rows[0]!.value).toBe("dark");
  });

  it("updated_at defaults to an ISO-8601-like datetime string", () => {
    const db = createHobbyforgeDb();

    db.prepare(
      "INSERT INTO app_settings (key, value) VALUES ('test-key', 'test-value')",
    ).run();

    const row = db
      .prepare(
        "SELECT updated_at FROM app_settings WHERE key = 'test-key'",
      )
      .get() as { updated_at: string } | undefined;
    db.close();

    expect(row?.updated_at).toBeDefined();
    // datetime('now') returns a string like "2026-06-10 12:34:56"
    expect(row?.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});
