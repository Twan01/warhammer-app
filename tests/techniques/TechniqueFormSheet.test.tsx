// @vitest-environment jsdom

/**
 * Regression test: TechniqueFormSheet create-mode render must not loop.
 *
 * Guards against the "Maximum update depth exceeded" infinite render loop that
 * occurred when the re-init effect depended on the React Query data arrays while
 * those arrays were re-created every render via an inline `= []` default (the
 * query is disabled in create mode, so `data` is undefined and the default fired
 * on every render → effect re-ran → setState → re-render → loop).
 *
 * The fix uses a stable module-level empty-array constant so the effect deps are
 * referentially stable across renders. This test reproduces create mode by
 * mocking the section/slot queries to return `{ data: undefined }`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TechniqueFormSheet } from "@/features/techniques/TechniqueFormSheet";

vi.mock("@/hooks/useTechniques", () => ({
  useCreateTechnique: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateTechnique: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock("@/hooks/useTechniqueSections", () => ({
  useTechniqueSections: vi.fn(() => ({ data: undefined })),
  useTechniqueSteps: vi.fn(() => ({ data: undefined })),
}));

vi.mock("@/hooks/useTechniqueColourSlots", () => ({
  useTechniqueColourSlots: vi.fn(() => ({ data: undefined })),
}));

function renderSheet() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TechniqueFormSheet open technique={null} onClose={() => {}} />
    </QueryClientProvider>,
  );
}

describe("TechniqueFormSheet — create mode render stability", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("renders the create form without an infinite update loop", () => {
    // If the effect loops, React throws "Maximum update depth exceeded" during
    // render and this call rejects — so a clean render is the assertion.
    renderSheet();

    expect(screen.getByText("New Technique")).toBeInTheDocument();

    // No "Maximum update depth exceeded" should have been logged.
    const loopLogged = errorSpy.mock.calls.some((args: unknown[]) =>
      args.some(
        (a: unknown) =>
          typeof a === "string" && a.includes("Maximum update depth exceeded"),
      ),
    );
    expect(loopLogged).toBe(false);
  });
});
