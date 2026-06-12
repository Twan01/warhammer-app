/**
 * NAV-01 — Painting Mode exit returnTo navigation.
 *
 * Tests the target-selection logic in PaintingModePageInner:
 *   (a) exit navigates to returnTo when it's a valid internal path ("/some/path")
 *   (b) falls back to "/" when returnTo is absent
 *   (c) rejects open-redirect values ("//evil.com", "http://x") → falls back to "/"
 *
 * Strategy: render a minimal wrapper that replicates the handleExit predicate by
 * mounting PaintingModePageInner's guard logic via a Button tied to a mocked
 * useNavigate. We mock all hooks and test the navigate({ to: target }) call value.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Capture navigate mock — must be declared before vi.mock hoisting
// ---------------------------------------------------------------------------
const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({ assignmentId: "1" }),
  Link: ({ children, to, ...rest }: any) => (
    <a href={to} {...rest}>{children}</a>
  ),
}));

// paintingModeRoute.useSearch — controls returnTo value per test
let mockReturnTo: string | undefined = undefined;
vi.mock("@/app/router", () => ({
  paintingModeRoute: {
    useSearch: () => ({ returnTo: mockReturnTo }),
  },
}));

// Hooks that fetch from SQLite — stub them all out
vi.mock("@/hooks/useRecipeAssignments", () => ({
  useRecipeAssignment: () => ({ data: { id: 1, recipe_id: 10, unit_id: 5 }, isLoading: false }),
  useCompleteStep: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/usePaintingModeState", () => ({
  usePaintingModeState: () => ({
    orderedSteps: [],
    currentStepId: null,
    isLoading: false,
    goNext: vi.fn(),
    goPrev: vi.fn(),
  }),
}));

vi.mock("@/hooks/useRecipeSections", () => ({
  useRecipeSections: () => ({ data: [] }),
}));

vi.mock("@/hooks/useUnits", () => ({
  useUnit: () => ({ data: undefined }),
  UNITS_KEY: ["units"],
}));

vi.mock("@/hooks/useRecipes", () => ({
  useRecipe: () => ({ data: undefined }),
}));

vi.mock("@/lib/dates", () => ({
  todayISO: () => "2026-06-12",
}));

vi.mock("react-hotkeys-hook", () => ({
  useHotkeys: vi.fn(),
}));

vi.mock("@/features/painting-mode/PaintingModeView", () => ({
  PaintingModeView: () => <div data-testid="painting-mode-view" />,
}));

vi.mock("@/features/painting-mode/PaintingSessionSheet", () => ({
  PaintingSessionSheet: () => <div data-testid="painting-session-sheet" />,
}));

// Import AFTER mocks are set up
import { PaintingModePage } from "@/app/painting-mode/page";

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <PaintingModePage />
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// We test the handleExit logic by triggering the Escape hotkey registered via
// useHotkeys. Since useHotkeys is mocked, we capture the handler and call it.
// ---------------------------------------------------------------------------

function captureEscapeHandler() {
  const { useHotkeys } = require("@/../../node_modules/react-hotkeys-hook") as any;
  // useHotkeys is a no-op mock — we need to intercept the escape registration.
  // Instead, we re-implement the guard inline and test it directly.
  // This avoids any coupling to the hook internals.
  return null;
}

// ---------------------------------------------------------------------------
// Guard logic extracted for unit-level assertion — mirrors page.tsx line 114:
//   const target = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
//                  ? returnTo : "/";
// We test the observable navigate call after rendering the full page, which
// registers the Escape hotkey via the mock. We call the escape handler by
// inspecting what useHotkeys captured.
// ---------------------------------------------------------------------------

// Re-capture approach: override useHotkeys to store handlers
const hotkeyHandlers: Record<string, () => void> = {};

vi.mock("react-hotkeys-hook", () => ({
  useHotkeys: (key: string, handler: () => void, _opts?: object) => {
    hotkeyHandlers[key] = handler;
  },
}));

beforeEach(() => {
  navigateMock.mockClear();
  Object.keys(hotkeyHandlers).forEach((k) => delete hotkeyHandlers[k]);
  mockReturnTo = undefined;
});

describe("NAV-01 — PaintingModePage handleExit returnTo logic", () => {
  it("(a) navigates to returnTo when it is a valid internal path", () => {
    mockReturnTo = "/collection";
    renderPage();
    // Trigger the escape handler captured by our useHotkeys mock
    expect(hotkeyHandlers["escape"]).toBeDefined();
    hotkeyHandlers["escape"]();
    expect(navigateMock).toHaveBeenCalledWith({ to: "/collection" });
  });

  it("(b) falls back to '/' when returnTo is absent", () => {
    mockReturnTo = undefined;
    renderPage();
    expect(hotkeyHandlers["escape"]).toBeDefined();
    hotkeyHandlers["escape"]();
    expect(navigateMock).toHaveBeenCalledWith({ to: "/" });
  });

  it("(c) rejects open-redirect '//evil.com' and falls back to '/'", () => {
    mockReturnTo = "//evil.com";
    renderPage();
    expect(hotkeyHandlers["escape"]).toBeDefined();
    hotkeyHandlers["escape"]();
    expect(navigateMock).toHaveBeenCalledWith({ to: "/" });
  });

  it("(c) rejects open-redirect 'http://evil.com' and falls back to '/'", () => {
    mockReturnTo = "http://evil.com";
    renderPage();
    expect(hotkeyHandlers["escape"]).toBeDefined();
    hotkeyHandlers["escape"]();
    expect(navigateMock).toHaveBeenCalledWith({ to: "/" });
  });
});
