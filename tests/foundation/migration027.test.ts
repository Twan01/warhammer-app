/**
 * Gap 2 + Gap 3 (partial) — Migration 027 file content assertions.
 *
 * Reads 027_battle_log_after_action.sql and lib.rs as raw strings and
 * verifies the additive-only contract: exactly 4 ALTER TABLE ADD COLUMN
 * statements, correct column names and types, no DROP/CREATE TABLE,
 * and lib.rs version 27 registration.
 *
 * tauri-plugin-sql IPC cannot run in jsdom; this is a content-shape test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = resolve(repoRoot, "src-tauri/migrations/027_battle_log_after_action.sql");
const libRsPath = resolve(repoRoot, "src-tauri/src/lib.rs");

describe("migration 027 battle_log_after_action — file content", () => {
  const sql = readFileSync(migrationPath, "utf-8");

  it("contains no DROP TABLE or CREATE TABLE statements (additive-only)", () => {
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
    expect(sql).not.toMatch(/CREATE\s+TABLE/i);
  });

  it("contains exactly 4 ALTER TABLE ADD COLUMN statements", () => {
    const alterCount = (sql.match(/ALTER\s+TABLE\s+battle_logs\s+ADD\s+COLUMN/gi) ?? []).length;
    expect(alterCount).toBe(4);
  });

  it("adds forgotten_rules as nullable TEXT (no NOT NULL)", () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+battle_logs\s+ADD\s+COLUMN\s+forgotten_rules\s+TEXT\s*;/i);
    const line = sql.split("\n").find(l => /\bforgotten_rules\b/.test(l)) ?? "";
    expect(line).not.toMatch(/NOT\s+NULL/i);
  });

  it("adds mvp_notes as nullable TEXT (no NOT NULL)", () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+battle_logs\s+ADD\s+COLUMN\s+mvp_notes\s+TEXT\s*;/i);
    const line = sql.split("\n").find(l => /\bmvp_notes\b/.test(l)) ?? "";
    expect(line).not.toMatch(/NOT\s+NULL/i);
  });

  it("adds underperformer_notes as nullable TEXT (no NOT NULL)", () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+battle_logs\s+ADD\s+COLUMN\s+underperformer_notes\s+TEXT\s*;/i);
    const line = sql.split("\n").find(l => /\bunderperformer_notes\b/.test(l)) ?? "";
    expect(line).not.toMatch(/NOT\s+NULL/i);
  });

  it("adds promoted_to_reminder as INTEGER NOT NULL DEFAULT 0", () => {
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+battle_logs\s+ADD\s+COLUMN\s+promoted_to_reminder\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0\s*;/i
    );
  });

  it("column order is: forgotten_rules, mvp_notes, underperformer_notes, promoted_to_reminder", () => {
    const forgottenPos = sql.indexOf("forgotten_rules");
    const mvpPos = sql.indexOf("mvp_notes");
    const underPos = sql.indexOf("underperformer_notes");
    const promotedPos = sql.indexOf("promoted_to_reminder");
    expect(forgottenPos).toBeLessThan(mvpPos);
    expect(mvpPos).toBeLessThan(underPos);
    expect(underPos).toBeLessThan(promotedPos);
  });
});

describe("migration 027 — lib.rs registration", () => {
  const libRs = readFileSync(libRsPath, "utf-8");

  it("contains version: 27 entry with description 'battle_log_after_action' referencing 027_battle_log_after_action.sql", () => {
    expect(libRs).toMatch(/version:\s*27\s*,/);
    expect(libRs).toMatch(/description:\s*"battle_log_after_action"/);
    expect(libRs).toMatch(/027_battle_log_after_action\.sql/);
  });

  it("version 27 is the highest version in get_migrations()", () => {
    // Extract all version numbers from get_migrations() vec (before get_rules_migrations)
    const getMigrationsBlock = libRs.split("fn get_rules_migrations")[0];
    const versions = [...getMigrationsBlock.matchAll(/version:\s*(\d+)\s*,/g)].map(m =>
      parseInt(m[1], 10)
    );
    expect(Math.max(...versions)).toBe(27);
  });
});
