/**
 * SETUP-05 — QueryProvider applies desktop-tuned TanStack Query defaults.
 *
 * SQLite apps do not benefit from web defaults (aggressive refetch, short
 * stale windows). Phase 1 set staleTime=5min, gcTime=10min,
 * refetchOnWindowFocus=false, retry=1 per ARCHITECTURE Anti-Pattern 3.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { QueryProvider } from "@/components/common/QueryProvider";

function Inspector() {
  const client = useQueryClient();
  const opts = client.getDefaultOptions().queries ?? {};
  return (
    <div>
      <span data-testid="staleTime">{String(opts.staleTime)}</span>
      <span data-testid="gcTime">{String(opts.gcTime)}</span>
      <span data-testid="refetchOnWindowFocus">{String(opts.refetchOnWindowFocus)}</span>
      <span data-testid="retry">{String(opts.retry)}</span>
    </div>
  );
}

describe("QueryProvider — SETUP-05 (desktop defaults)", () => {
  it("renders children", () => {
    render(
      <QueryProvider>
        <span data-testid="child">hello</span>
      </QueryProvider>
    );
    expect(screen.getByTestId("child")).toBeDefined();
  });

  it("applies 5-minute staleTime", () => {
    render(<QueryProvider><Inspector /></QueryProvider>);
    expect(screen.getByTestId("staleTime").textContent).toBe(String(1000 * 60 * 5));
  });

  it("applies 10-minute gcTime", () => {
    render(<QueryProvider><Inspector /></QueryProvider>);
    expect(screen.getByTestId("gcTime").textContent).toBe(String(1000 * 60 * 10));
  });

  it("disables refetchOnWindowFocus", () => {
    render(<QueryProvider><Inspector /></QueryProvider>);
    expect(screen.getByTestId("refetchOnWindowFocus").textContent).toBe("false");
  });

  it("sets retry to 1", () => {
    render(<QueryProvider><Inspector /></QueryProvider>);
    expect(screen.getByTestId("retry").textContent).toBe("1");
  });
});
