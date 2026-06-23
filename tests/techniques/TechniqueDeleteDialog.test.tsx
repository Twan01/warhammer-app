// @vitest-environment jsdom

/**
 * Nyquist test: TechniqueDeleteDialog component (TECH-03, SAFE-03).
 *
 * - TECH-03 / SAFE-03: Delete dialog description varies by liveInstanceCount:
 *   - Case A (0 live instances): permanent-remove copy + "Delete" button
 *   - Case B (N > 0 live instances): live-linked copy + consequence-labelled button
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TechniqueDeleteDialog } from "@/features/techniques/TechniqueDeleteDialog";
import type { Technique } from "@/types/technique";

// ---------------------------------------------------------------------------
// Mock the delete hook
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useTechniques", () => ({
  useDeleteTechnique: vi.fn(),
}));

import { useDeleteTechnique } from "@/hooks/useTechniques";

const mockMutateAsync = vi.fn();

beforeEach(() => {
  vi.mocked(useDeleteTechnique).mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  } as never);
});

// ---------------------------------------------------------------------------
// Stub data
// ---------------------------------------------------------------------------

const stubTechnique: Technique = {
  id: 1,
  name: "OSL Glow",
  effect: "OSL",
  difficulty: "Advanced",
  notes: null,
  created_at: "2026-06-21T00:00:00Z",
  updated_at: "2026-06-21T00:00:00Z",
};

const noop = vi.fn();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TechniqueDeleteDialog (TECH-03, SAFE-03)", () => {
  it("renders dialog title", () => {
    render(
      <TechniqueDeleteDialog
        open={true}
        technique={stubTechnique}
        liveInstanceCount={0}
        onClose={noop}
      />,
    );
    expect(screen.getByText("Delete technique?")).toBeInTheDocument();
  });

  // ── Case A: no live instances ──────────────────────────────────────────────

  it("Case A: shows permanent-remove copy when liveInstanceCount is 0 (TECH-03)", () => {
    render(
      <TechniqueDeleteDialog
        open={true}
        technique={stubTechnique}
        liveInstanceCount={0}
        onClose={noop}
      />,
    );
    expect(
      screen.getByText(/This will permanently remove "OSL Glow" and all its steps/),
    ).toBeInTheDocument();
    expect(screen.getByText(/This cannot be undone/)).toBeInTheDocument();
  });

  it("Case A: renders 'Delete' confirm button (TECH-03)", () => {
    render(
      <TechniqueDeleteDialog
        open={true}
        technique={stubTechnique}
        liveInstanceCount={0}
        onClose={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("Case A: shows 'Deleting…' when isPending is true", () => {
    vi.mocked(useDeleteTechnique).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
    } as never);
    render(
      <TechniqueDeleteDialog
        open={true}
        technique={stubTechnique}
        liveInstanceCount={0}
        onClose={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeInTheDocument();
  });

  // ── Case B: live instances present ────────────────────────────────────────

  it("Case B: shows live-linked copy when liveInstanceCount is 2 (SAFE-03)", () => {
    render(
      <TechniqueDeleteDialog
        open={true}
        technique={stubTechnique}
        liveInstanceCount={2}
        onClose={noop}
      />,
    );
    expect(
      screen.getByText(/"OSL Glow" is live-linked to 2 recipes/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No recipe content will be lost/),
    ).toBeInTheDocument();
  });

  it("Case B: confirm button is pluralised 'Detach 2 recipes & delete' (SAFE-03)", () => {
    render(
      <TechniqueDeleteDialog
        open={true}
        technique={stubTechnique}
        liveInstanceCount={2}
        onClose={noop}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Detach 2 recipes & delete" }),
    ).toBeInTheDocument();
  });

  it("Case B: confirm button is singular 'Detach 1 recipe & delete' when liveInstanceCount is 1 (SAFE-03)", () => {
    render(
      <TechniqueDeleteDialog
        open={true}
        technique={stubTechnique}
        liveInstanceCount={1}
        onClose={noop}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Detach 1 recipe & delete" }),
    ).toBeInTheDocument();
  });

  it("Case B: shows 'Detaching & deleting…' when isPending is true (SAFE-03)", () => {
    vi.mocked(useDeleteTechnique).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
    } as never);
    render(
      <TechniqueDeleteDialog
        open={true}
        technique={stubTechnique}
        liveInstanceCount={2}
        onClose={noop}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Detaching & deleting…" }),
    ).toBeInTheDocument();
  });

  // ── Cancel button (both cases) ────────────────────────────────────────────

  it("renders 'Keep Technique' cancel button (both cases)", () => {
    render(
      <TechniqueDeleteDialog
        open={true}
        technique={stubTechnique}
        liveInstanceCount={0}
        onClose={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Keep Technique" })).toBeInTheDocument();
  });
});
