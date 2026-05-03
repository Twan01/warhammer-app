/**
 * SETUP-02 — AppSidebar renders all Phase 1 nav entries.
 *
 * Phase 1 required six navigable sidebar entries (Dashboard, Collection,
 * Painting Projects, Recipes, Paints, Settings) plus a collapse toggle.
 * Subsequent phases added Factions (Phase 2) and Army Lists (Phase 8) to the
 * same component — this file covers the original Phase 1 surface only.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { AppSidebar } from "@/components/common/AppSidebar";

function makeRouter(initialPath = "/") {
  const root = createRootRoute({ component: () => <AppSidebar /> });
  return createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

beforeEach(() => {
  window.localStorage.removeItem("sidebar:collapsed");
});

describe("AppSidebar — SETUP-02 (nav entries)", () => {
  it("renders all six original Phase 1 nav labels", async () => {
    render(<RouterProvider router={makeRouter()} />);
    await screen.findByText("Dashboard");
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Collection")).toBeDefined();
    expect(screen.getByText("Painting Projects")).toBeDefined();
    expect(screen.getByText("Recipes")).toBeDefined();
    expect(screen.getByText("Paints")).toBeDefined();
    expect(screen.getByText("Settings")).toBeDefined();
  });

  it("renders HobbyForge app name in expanded state", async () => {
    render(<RouterProvider router={makeRouter()} />);
    await screen.findByText("HobbyForge");
    expect(screen.getByText("HobbyForge")).toBeDefined();
  });

  it("renders the collapse toggle button with correct aria-label", async () => {
    render(<RouterProvider router={makeRouter()} />);
    await screen.findByText("Dashboard");
    const toggle = screen.getByRole("button", { name: /collapse sidebar/i });
    expect(toggle).toBeDefined();
  });

  it("renders aside element with data-collapsed false by default", async () => {
    render(<RouterProvider router={makeRouter()} />);
    await screen.findByText("Dashboard");
    const aside = document.querySelector("aside[data-collapsed='false']");
    expect(aside).not.toBeNull();
  });
});
