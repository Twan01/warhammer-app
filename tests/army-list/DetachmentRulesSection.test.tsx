/**
 * ARMY-02 / ARMY-03 -- DetachmentRulesSection tests.
 * Phase 107: detachment/stratagem data source (rules.db) eliminated -- stubs return empty.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DetachmentRulesSection } from "@/features/army-lists/DetachmentRulesSection";

function renderSection(detachmentId: string | null | undefined) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DetachmentRulesSection detachmentId={detachmentId} />
    </QueryClientProvider>,
  );
}

describe("DetachmentRulesSection", () => {
  it("renders empty state when detachmentId is null", () => {
    renderSection(null);
    expect(screen.getByText("Select a detachment to see its rules")).toBeInTheDocument();
  });

  it("renders 'No rules data available' when detachmentId set (data source removed in Phase 107)", () => {
    renderSection("DET001");
    expect(screen.getByText(/No rules data available/)).toBeInTheDocument();
  });
});
