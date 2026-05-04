/**
 * Phase 25 (DSFD-01) — Design token presence in globals.css.
 *
 * These tests verify that the CSS variable names required by the design token
 * spec are present in the source file. They use fs.readFileSync — no browser,
 * no Tauri, no DOM required.
 *
 * jsdom cannot compute CSS custom property values, so we verify the token
 * names (their string presence in the file) rather than their resolved colors.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CSS_PATH = resolve(__dirname, "../../src/styles/globals.css");
const cssContent = readFileSync(CSS_PATH, "utf-8");

describe("DSFD-01 — design tokens defined in globals.css", () => {
  describe(".dark block — CSS custom property declarations", () => {
    it("contains --forge-black", () => {
      expect(cssContent).toContain("--forge-black");
    });

    it("contains --panel-elevated", () => {
      expect(cssContent).toContain("--panel-elevated");
    });

    it("contains --panel-surface", () => {
      expect(cssContent).toContain("--panel-surface");
    });

    it("contains --battle-gold", () => {
      expect(cssContent).toContain("--battle-gold");
    });
  });

  describe("@theme inline block — Tailwind utility registrations", () => {
    it("contains --color-forge-black", () => {
      expect(cssContent).toContain("--color-forge-black");
    });

    it("contains --color-panel-elevated", () => {
      expect(cssContent).toContain("--color-panel-elevated");
    });

    it("contains --color-panel-surface", () => {
      expect(cssContent).toContain("--color-panel-surface");
    });

    it("contains --color-battle-gold", () => {
      expect(cssContent).toContain("--color-battle-gold");
    });
  });

  describe("token wiring — aliases reference existing tokens", () => {
    it("--forge-black aliases the background token", () => {
      expect(cssContent).toContain("--forge-black: hsl(var(--background))");
    });

    it("--panel-elevated aliases the card token", () => {
      expect(cssContent).toContain("--panel-elevated: hsl(var(--card))");
    });

    it("--panel-surface aliases the secondary token", () => {
      expect(cssContent).toContain("--panel-surface: hsl(var(--secondary))");
    });

    it("--battle-gold uses the correct oklch value", () => {
      expect(cssContent).toContain("--battle-gold: oklch(0.78 0.17 85)");
    });
  });
});
