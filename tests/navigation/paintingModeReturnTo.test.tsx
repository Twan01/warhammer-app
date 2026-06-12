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
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
// useHotkeys. The useHotkeys mock below stores each handler so the test can
// invoke the escape handler directly and assert the resulting navigate call.
// The exit target is resolved by the real resolveReturnTo() (src/lib), which
// the page imports — so these tests exercise the open-redirect guard (WR-02
// preservation) and the unmatched-route degradation (WR-03) end to end.
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

  it("(d) preserves search params for a known route (WR-02)", () => {
    mockReturnTo = "/recipes?paintId=3";
    renderPage();
    expect(hotkeyHandlers["escape"]).toBeDefined();
    hotkeyHandlers["escape"]();
    expect(navigateMock).toHaveBeenCalledWith({ to: "/recipes?paintId=3" });
  });

  it("(e) degrades an unknown/stale internal route to '/' (WR-03)", () => {
    mockReturnTo = "/not-a-real-route/123";
    renderPage();
    expect(hotkeyHandlers["escape"]).toBeDefined();
    hotkeyHandlers["escape"]();
    expect(navigateMock).toHaveBeenCalledWith({ to: "/" });
  });

  it("(e) allows a known dynamic route with a concrete id (WR-03)", () => {
    mockReturnTo = "/army-lists/999";
    renderPage();
    expect(hotkeyHandlers["escape"]).toBeDefined();
    hotkeyHandlers["escape"]();
    // Parent segment is known; the destination page handles a stale id with
    // its own empty state rather than the global router error boundary.
    expect(navigateMock).toHaveBeenCalledWith({ to: "/army-lists/999" });
  });
});
