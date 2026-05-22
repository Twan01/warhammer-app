/**
 * ERR-02 — Both layout routes have errorComponent set for per-section isolation.
 *
 * Imports the exported layoutRoute and bareLayoutRoute from router.tsx and asserts
 * that errorComponent is wired to RouteErrorFallback.
 */
import { describe, it, expect } from "vitest";
import { layoutRoute, bareLayoutRoute } from "@/app/router";
import { RouteErrorFallback } from "@/components/common/RouteErrorFallback";

describe("Router layout routes — ERR-02", () => {
  it("layoutRoute has errorComponent set to RouteErrorFallback", () => {
    expect(layoutRoute.options.errorComponent).toBeDefined();
    expect(layoutRoute.options.errorComponent).toBe(RouteErrorFallback);
  });

  it("bareLayoutRoute has errorComponent set to RouteErrorFallback", () => {
    expect(bareLayoutRoute.options.errorComponent).toBeDefined();
    expect(bareLayoutRoute.options.errorComponent).toBe(RouteErrorFallback);
  });
});
