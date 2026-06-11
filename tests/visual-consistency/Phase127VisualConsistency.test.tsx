/**
 * Phase 127 — Visual consistency source-level assertions.
 *
 * These tests verify CSS class patterns in implementation source files
 * using readFileSync, since jsdom does not process Tailwind classes.
 *
 * Covers:
 * - VIS-01: DatabaseBrowserPage PageHeader adoption
 * - VIS-02: FactionsPage subtitle
 * - VIS-05: PaintsPage filtered empty state icon-pill pattern
 * - VIS-08: FactionsEmptyState max-w-xs
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// VIS-01: DatabaseBrowserPage uses PageHeader
// ---------------------------------------------------------------------------
describe("DatabaseBrowserPage — VIS-01: PageHeader adoption", () => {
  const source = readSource("src/features/unit-database/DatabaseBrowserPage.tsx");

  it("imports PageHeader from @/components/common/PageHeader", () => {
    expect(source).toContain('import { PageHeader } from "@/components/common/PageHeader"');
  });

  it("renders PageHeader with title 'Unit Database'", () => {
    expect(source).toContain('title="Unit Database"');
  });

  it("renders PageHeader with subtitle", () => {
    expect(source).toContain('subtitle="Browse canonical Warhammer 40,000 unit datasheets"');
  });

  it("has no bare h1 elements", () => {
    expect(source).not.toMatch(/<h1[\s>]/);
  });
});

// ---------------------------------------------------------------------------
// VIS-02: FactionsPage PageHeader has subtitle
// ---------------------------------------------------------------------------
describe("FactionsPage — VIS-02: PageHeader subtitle", () => {
  const source = readSource("src/features/factions/FactionsPage.tsx");

  it("PageHeader has subtitle prop set to 'Manage your army factions'", () => {
    expect(source).toContain('subtitle="Manage your army factions"');
  });
});

// ---------------------------------------------------------------------------
// VIS-05: PaintsPage filtered empty state icon-pill pattern
// ---------------------------------------------------------------------------
describe("PaintsPage — VIS-05: filtered empty state icon-pill pattern", () => {
  const source = readSource("src/features/paints/PaintsPage.tsx");

  it("contains icon-pill wrapper class 'rounded-xl bg-muted/40 p-4'", () => {
    expect(source).toContain("rounded-xl bg-muted/40 p-4");
  });

  it("imports Palette icon from lucide-react", () => {
    expect(source).toContain("Palette");
  });

  it("contains py-16 on filtered empty state outer div", () => {
    expect(source).toContain("py-16");
  });

  it("contains text-base font-semibold heading in empty state", () => {
    expect(source).toContain("text-base font-semibold");
  });

  it("contains max-w-xs on empty state description", () => {
    expect(source).toContain("max-w-xs");
  });

  it("no items-start gap-2 old filtered state pattern remains", () => {
    expect(source).not.toContain("items-start gap-2");
  });
});

// ---------------------------------------------------------------------------
// VIS-08: FactionsEmptyState max-w-xs on description
// ---------------------------------------------------------------------------
describe("FactionsEmptyState — VIS-08: max-w-xs on description", () => {
  const source = readSource("src/features/factions/FactionsEmptyState.tsx");

  it("description paragraph has max-w-xs class", () => {
    expect(source).toContain("max-w-xs");
  });

  it("description paragraph combines text-sm text-muted-foreground with max-w-xs", () => {
    expect(source).toContain("text-sm text-muted-foreground max-w-xs");
  });
});
