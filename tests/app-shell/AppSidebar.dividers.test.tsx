/**
 * NAV-04 / NAV-05 — AppSidebar Game Day entry + collapsed group dividers.
 *
 * Behaviors:
 *   (a) Game Day nav entry is present in the sidebar (NAV-04)
 *   (b) when collapsed, 3 group dividers render (h-px bg-border filled line)
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

    // Each collapsed group separator is a filled <div class="... h-px bg-border">
    const nav = document.querySelector("nav");
    const allDivs = nav ? nav.querySelectorAll("div") : document.querySelectorAll("nav div");
    const dividers = Array.from(allDivs).filter((el) =>
      el.className.includes("h-px") && el.className.includes("bg-border"),
    );
    // Three dividers: between Command/Workshop, Workshop/Play, Play/Management
    expect(dividers.length).toBeGreaterThanOrEqual(3);
  });

  it("does NOT render group dividers when sidebar is expanded", async () => {
    // Expanded is the default (localStorage key absent)
    render(<RouterProvider router={makeRouter()} />);
    await screen.findByText("Dashboard");

    // No h-px bg-border divider <div>s should exist inside nav
    const nav = document.querySelector("nav");
    const allDivs = nav ? nav.querySelectorAll("div") : document.querySelectorAll("nav div");
    const dividers = Array.from(allDivs).filter((el) =>
      el.className.includes("h-px") && el.className.includes("bg-border"),
    );
    expect(dividers.length).toBe(0);
  });
});
