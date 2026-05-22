/**
 * ERR-01 — RouteErrorFallback renders a styled fallback UI on route-level errors.
 *
 * Uses a minimal router context because the component renders a TanStack Router Link.
 * DEV/PROD visibility is controlled via vi.stubEnv on import.meta.env.DEV.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { RouteErrorFallback } from "@/components/common/RouteErrorFallback";

function renderWithRouter(ui: React.ReactElement) {
  const root = createRootRoute({ component: () => ui });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("RouteErrorFallback — ERR-01", () => {
  it("renders 'Something went wrong' heading", async () => {
    renderWithRouter(
      <RouteErrorFallback error={new Error("test")} reset={vi.fn()} />,
    );
    expect(await screen.findByText("Something went wrong")).toBeDefined();
  });

  it("shows error message in DEV mode", async () => {
    vi.stubEnv("DEV", true);
    renderWithRouter(
      <RouteErrorFallback
        error={new Error("test error msg")}
        reset={vi.fn()}
      />,
    );
    expect(await screen.findByText(/test error msg/)).toBeDefined();
  });

  it("hides error message in PROD mode", async () => {
    vi.stubEnv("DEV", false);
    renderWithRouter(
      <RouteErrorFallback error={new Error("secret")} reset={vi.fn()} />,
    );
    await screen.findByText("Something went wrong");
    expect(screen.queryByText(/secret/)).toBeNull();
  });

  it("calls reset when 'Reload Page' is clicked", async () => {
    const mockReset = vi.fn();
    renderWithRouter(
      <RouteErrorFallback error={new Error("test")} reset={mockReset} />,
    );
    const button = await screen.findByText("Reload Page");
    fireEvent.click(button);
    expect(mockReset).toHaveBeenCalledOnce();
  });

  it("renders 'Go to Dashboard' link", async () => {
    renderWithRouter(
      <RouteErrorFallback error={new Error("test")} reset={vi.fn()} />,
    );
    expect(await screen.findByText("Go to Dashboard")).toBeDefined();
  });
});
