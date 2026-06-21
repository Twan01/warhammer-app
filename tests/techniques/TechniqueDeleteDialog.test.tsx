// @vitest-environment jsdom

/**
 * Nyquist test: TechniqueDeleteDialog component (TECH-03).
 *
 * - TECH-03: Delete dialog description varies by usage count:
 *   - 0 recipes: permanent-remove copy
 *   - N recipes: usage warning with count
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

describe("TechniqueDeleteDialog (TECH-03)", () => {
  it("renders dialog title", () => {
    render(
      <TechniqueDeleteDialog
        open={true}
        technique={stubTechnique}
        usageCount={0}
        onClose={noop}
      />,
    );
    expect(screen.getByText("Delete technique?")).toBeInTheDocument();
  });

  it("shows permanent-remove copy when usageCount is 0 (TECH-03)", () => {
    render(
      <TechniqueDeleteDialog
        open={true}
        technique={stubTechnique}
        usageCount={0}
        onClose={noop}
      />,
    );
    expect(
      screen.getByText(/This will permanently remove "OSL Glow" and all its steps/),
    ).toBeInTheDocument();
    expect(screen.getByText(/This cannot be undone/)).toBeInTheDocument();
  });

  it("shows usage warning when usageCount is 2 (TECH-03)", () => {
    render(
      <TechniqueDeleteDialog
        open={true}
        technique={stubTechnique}
        usageCount={2}
        onClose={noop}
      />,
    );
    expect(
      screen.getByText(/"OSL Glow" is used by 2 recipes/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Deleting it will remove all applied instances/),
    ).toBeInTheDocument();
  });

  it("shows singular 'recipe' when usageCount is 1", () => {
    render(
      <TechniqueDeleteDialog
        open={true}
        technique={stubTechnique}
        usageCount={1}
        onClose={noop}
      />,
    );
    expect(screen.getByText(/"OSL Glow" is used by 1 recipe\./)).toBeInTheDocument();
  });

  it("renders 'Keep Technique' cancel button", () => {
    render(
      <TechniqueDeleteDialog
        open={true}
        technique={stubTechnique}
        usageCount={0}
        onClose={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Keep Technique" })).toBeInTheDocument();
  });

  it("renders 'Delete' destructive button", () => {
    render(
      <TechniqueDeleteDialog
        open={true}
        technique={stubTechnique}
        usageCount={0}
        onClose={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("shows 'Deleting…' when isPending is true", () => {
    vi.mocked(useDeleteTechnique).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
    } as never);
    render(
      <TechniqueDeleteDialog
        open={true}
        technique={stubTechnique}
        usageCount={0}
        onClose={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeInTheDocument();
  });
});
