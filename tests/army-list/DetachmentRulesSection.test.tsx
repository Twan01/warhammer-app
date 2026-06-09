/**
 * ARMY-02 / ARMY-03 -- DetachmentRulesSection tests.
 * Phase 120: wired to real canonical DB data via useGameData hooks.
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

  it("renders loading skeletons when detachmentId is set and data is pending", () => {
    renderSection("DET001");
    expect(screen.getAllByRole("generic").filter((el) => el.dataset.slot === "skeleton")).toHaveLength(3);
  });
});
