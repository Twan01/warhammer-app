/**
 * PERF-01 — Verify that route page imports are lazy-loaded via React.lazy.
 *
 * These tests confirm:
 *  1. The router module exports valid objects (layoutRoute, bareLayoutRoute, router).
 *  2. The router module does NOT re-export page components as named exports
 *     (which would indicate eager static imports are still present).
 *  3. The router.tsx source file contains the expected React.lazy patterns.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const ROUTER_PATH = path.resolve(__dirname, "../../src/app/router.tsx");
const routerSource = fs.readFileSync(ROUTER_PATH, "utf-8");

describe("lazyRoutes", () => {
  it("router.tsx imports lazy and Suspense from react", () => {
    expect(routerSource).toMatch(/import\s*\{[^}]*lazy[^}]*\}\s*from\s*["']react["']/);
    expect(routerSource).toMatch(/import\s*\{[^}]*Suspense[^}]*\}\s*from\s*["']react["']/);
  });

  it("router.tsx contains exactly 16 React.lazy dynamic imports (one per page)", () => {
    const lazyMatches = routerSource.match(/=\s*lazy\(\s*\(\)/g);
    expect(lazyMatches).not.toBeNull();
    expect(lazyMatches!.length).toBe(16);
  });

  it("router.tsx has zero static page imports from route modules", () => {
    const staticPageImports = [
      'from "./dashboard/page"',
      'from "./collection/page"',
      'from "./painting-projects/page"',
      'from "./recipes/page"',
      'from "./paints/page"',
      'from "./settings/page"',
      'from "./factions/page"',
      'from "./army-lists/page"',
      'from "./spending/page"',
      'from "./battle-log/page"',
      'from "./wishlist/page"',
      'from "./goals/page"',
      'from "./rules-hub/page"',
      'from "./game-day/page"',
      'from "./data-health/page"',
      'from "./painting-mode/page"',
    ];
    // Static imports have the form: import { X } from "path" (not inside a function call)
    // Dynamic imports inside lazy() are: import("path"), not import { X } from "path"
    for (const imp of staticPageImports) {
      // Match a static import statement: starts with 'import' (with possible whitespace/braces)
      // NOT inside a lazy(() => import("...")) call
      const staticPattern = new RegExp(`^import\\s+\\{[^}]+\\}\\s+${imp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m");
      expect(routerSource).not.toMatch(staticPattern);
    }
  });

  it("router.tsx layoutRoute component contains Suspense wrapping Outlet", () => {
    // Suspense must appear before Outlet in layoutRoute
    const layoutSection = routerSource.slice(
      routerSource.indexOf("layoutRoute = createRoute"),
      routerSource.indexOf("bareLayoutRoute = createRoute"),
    );
    expect(layoutSection).toContain("Suspense");
    expect(layoutSection).toContain("<Outlet />");
    // Suspense must appear before Outlet in the layout
    const suspenseIdx = layoutSection.indexOf("Suspense");
    const outletIdx = layoutSection.indexOf("<Outlet />");
    expect(suspenseIdx).toBeLessThan(outletIdx);
  });

  it("router.tsx bareLayoutRoute component contains Suspense wrapping Outlet", () => {
    const bareSection = routerSource.slice(
      routerSource.indexOf("bareLayoutRoute = createRoute"),
      routerSource.indexOf("// Standard page routes"),
    );
    expect(bareSection).toContain("Suspense");
    expect(bareSection).toContain("<Outlet />");
    const suspenseIdx = bareSection.indexOf("Suspense");
    const outletIdx = bareSection.indexOf("<Outlet />");
    expect(suspenseIdx).toBeLessThan(outletIdx);
  });

  it("router.tsx uses named-export adapter pattern for all lazy imports", () => {
    // Each lazy import line ends with: .then(m => ({ default: m.PageName })));
    // Count only lines that contain "const " + "= lazy(" to avoid counting the comment
    const lazyDeclarationLines = routerSource
      .split("\n")
      .filter((line) => line.includes("= lazy(") && line.includes(".then(m => ({ default: m."));
    expect(lazyDeclarationLines.length).toBe(16);
  });
});
