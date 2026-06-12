/**
 * NAV-04 / NAV-05 — AppSidebar Game Day entry + collapsed group dividers.
 *
 * Behaviors:
 *   (a) Game Day nav entry is present in the sidebar (NAV-04)
 *   (b) when collapsed, 3 group dividers render (border-b border-border/40)
 *   (c) when expanded, dividers do NOT render
 *
 * Collapse state is driven by localStorage "sidebar:collapsed".
 * Mirrors tests/app-shell/AppSidebar.test.tsx for router/mock setup.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/common/AppSidebar";

vi.mock("@/context/QuickAddContext", () => ({
  useQuickAdd: () => ({
    activeSheet: null,
    openQuickAdd: vi.fn(),
    closeQuickAdd: vi.fn(),
  }),
}));

function makeRouter(initialPath = "/") {
  const root = createRootRoute({
    component: () => (
      <TooltipProvider>
        <AppSidebar />
      </TooltipProvider>
    ),
  });
  return createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

beforeEach(() => {
  window.localStorage.removeItem("sidebar:collapsed");
});

describe("AppSidebar — NAV-04: Game Day nav entry", () => {
  it("renders 'Game Day' nav label in expanded state", async () => {
    render(<RouterProvider router={makeRouter()} />);
    await screen.findByText("Dashboard");
    expect(screen.getByText("Game Day")).toBeInTheDocument();
  });
});

describe("AppSidebar — NAV-05: collapsed group dividers", () => {
  it("renders 3 group dividers when sidebar is collapsed", async () => {
    window.localStorage.setItem("sidebar:collapsed", "true");
    render(<RouterProvider router={makeRouter()} />);
    await screen.findByLabelText("Expand sidebar");

    // Each collapsed group separator is a <div class="my-1 border-b border-border/40">
    // querySelector with attribute-value containing "/" needs attribute selector
    const nav = document.querySelector("nav");
    const allDivs = nav ? nav.querySelectorAll("div") : document.querySelectorAll("nav div");
    const dividers = Array.from(allDivs).filter((el) =>
      el.className.includes("border-b") && el.className.includes("border-border/40"),
    );
    // Three dividers: between Command/Workshop, Workshop/Play, Play/Management
    expect(dividers.length).toBeGreaterThanOrEqual(3);
  });

  it("does NOT render group dividers when sidebar is expanded", async () => {
    // Expanded is the default (localStorage key absent)
    render(<RouterProvider router={makeRouter()} />);
    await screen.findByText("Dashboard");

    // No border-b border-border/40 divider <div>s should exist inside nav
    const nav = document.querySelector("nav");
    const allDivs = nav ? nav.querySelectorAll("div") : document.querySelectorAll("nav div");
    const dividers = Array.from(allDivs).filter((el) =>
      el.className.includes("border-b") && el.className.includes("border-border/40"),
    );
    expect(dividers.length).toBe(0);
  });
});
