/**
 * ARMY-04 — StaleDataBanner: amber warning for stale rules data (>30 days).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StaleDataBanner } from "@/features/army-lists/StaleDataBanner";

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

describe("StaleDataBanner", () => {
  it("ARMY-04: renders warning when lastSyncAt is null", () => {
    render(<StaleDataBanner lastSyncAt={null} />);
    expect(screen.getByText(/Rules data is over 30 days old/i)).toBeInTheDocument();
  });

  it("ARMY-04: renders warning when lastSyncAt is undefined", () => {
    render(<StaleDataBanner lastSyncAt={undefined} />);
    expect(screen.getByText(/Rules data is over 30 days old/i)).toBeInTheDocument();
  });

  it("ARMY-04: renders warning when lastSyncAt is more than 30 days ago", () => {
    render(<StaleDataBanner lastSyncAt={daysAgo(31)} />);
    expect(screen.getByText(/Rules data is over 30 days old/i)).toBeInTheDocument();
  });

  it("ARMY-04: does NOT render when lastSyncAt is less than 30 days ago", () => {
    render(<StaleDataBanner lastSyncAt={daysAgo(29)} />);
    expect(screen.queryByText(/Rules data is over 30 days old/i)).not.toBeInTheDocument();
  });

  it("ARMY-04: does NOT render when lastSyncAt is exactly 30 days ago", () => {
    // Exactly 30 days = NOT stale (threshold is strictly > 30 days).
    // Use a timestamp 1 second short of 30 days to avoid floating-point drift.
    const exactlyThirtyDays = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 1000).toISOString();
    render(<StaleDataBanner lastSyncAt={exactlyThirtyDays} />);
    expect(screen.queryByText(/Rules data is over 30 days old/i)).not.toBeInTheDocument();
  });
});
