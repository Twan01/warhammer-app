// @vitest-environment jsdom

/**
 * Nyquist test: TechniqueDetailSheet component (LIB-04, TECH-05).
 *
 * - LIB-04: "Not used by any recipes yet." shown when usedBy count is 0
 * - TECH-05: section/step tree renders when steps are present
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TechniqueDetailSheet } from "@/features/techniques/TechniqueDetailSheet";
import type { Technique, TechniqueSection, TechniqueStep, TechniqueColourSlot } from "@/types/technique";

// ---------------------------------------------------------------------------
// Mock the hooks this component calls
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useTechniqueSections", () => ({
  useTechniqueSections: vi.fn(),
  useTechniqueSteps: vi.fn(),
}));

vi.mock("@/hooks/useTechniqueColourSlots", () => ({
  useTechniqueColourSlots: vi.fn(),
}));

vi.mock("@/hooks/useTechniques", () => ({
  useTechniqueUsedByRecipes: vi.fn(),
  useDuplicateTechnique: vi.fn(),
}));

import { useTechniqueSections, useTechniqueSteps } from "@/hooks/useTechniqueSections";
import { useTechniqueColourSlots } from "@/hooks/useTechniqueColourSlots";
import { useTechniqueUsedByRecipes, useDuplicateTechnique } from "@/hooks/useTechniques";

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

const stubSection: TechniqueSection = {
  id: 10,
  technique_id: 1,
  name: "Base Layer",
  surface: null,
  optional: 0,
  order_index: 0,
  notes: null,
  created_at: "2026-06-21T00:00:00Z",
  updated_at: "2026-06-21T00:00:00Z",
};

const stubStep: TechniqueStep = {
  id: 20,
  technique_section_id: 10,
  colour_slot_id: null,
  step_name: "Apply OSL base",
  order_index: 0,
  notes: null,
  painting_phase: "Base",
  tool: null,
  technique: null,
  dilution: null,
  time_estimate_minutes: null,
  created_at: "2026-06-21T00:00:00Z",
};

const stubSlot: TechniqueColourSlot = {
  id: 5,
  technique_id: 1,
  name: "OSL Base",
  role_hint: "darkest tone",
  order_index: 0,
  created_at: "2026-06-21T00:00:00Z",
};

const noop = vi.fn();
const mockMutateAsync = vi.fn();

beforeEach(() => {
  vi.mocked(useTechniqueSections).mockReturnValue({ data: [], isLoading: false } as never);
  vi.mocked(useTechniqueSteps).mockReturnValue({ data: [], isLoading: false } as never);
  vi.mocked(useTechniqueColourSlots).mockReturnValue({ data: [], isLoading: false } as never);
  vi.mocked(useTechniqueUsedByRecipes).mockReturnValue({ data: [], isLoading: false } as never);
  vi.mocked(useDuplicateTechnique).mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  } as never);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TechniqueDetailSheet (LIB-04, TECH-05)", () => {
  it("renders nothing when technique is null", () => {
    const { container } = render(
      <TechniqueDetailSheet
        open={true}
        technique={null}
        onClose={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    // Sheet is mounted but SheetTitle should not appear
    expect(container.querySelector("h2")).toBeNull();
  });

  it("renders the technique name when open", () => {
    render(
      <TechniqueDetailSheet
        open={true}
        technique={stubTechnique}
        onClose={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("OSL Glow")).toBeInTheDocument();
  });

  it("shows 'Not used by any recipes yet.' when usedBy list is empty (LIB-04)", () => {
    vi.mocked(useTechniqueUsedByRecipes).mockReturnValue({ data: [], isLoading: false } as never);
    render(
      <TechniqueDetailSheet
        open={true}
        technique={stubTechnique}
        onClose={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("Not used by any recipes yet.")).toBeInTheDocument();
  });

  it("shows recipe names when usedBy list is non-empty", () => {
    vi.mocked(useTechniqueUsedByRecipes).mockReturnValue({
      data: [{ recipe_id: 99, name: "Ultramarines Blue" }],
      isLoading: false,
    } as never);
    render(
      <TechniqueDetailSheet
        open={true}
        technique={stubTechnique}
        onClose={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("Ultramarines Blue")).toBeInTheDocument();
    expect(screen.queryByText("Not used by any recipes yet.")).toBeNull();
  });

  it("renders section/step tree when sections and steps are present (TECH-05)", () => {
    vi.mocked(useTechniqueSections).mockReturnValue({ data: [stubSection], isLoading: false } as never);
    vi.mocked(useTechniqueSteps).mockReturnValue({ data: [stubStep], isLoading: false } as never);
    render(
      <TechniqueDetailSheet
        open={true}
        technique={stubTechnique}
        onClose={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("Base Layer")).toBeInTheDocument();
    expect(screen.getByText("Apply OSL base")).toBeInTheDocument();
  });

  it("renders colour slots section with slot name and role hint", () => {
    vi.mocked(useTechniqueColourSlots).mockReturnValue({ data: [stubSlot], isLoading: false } as never);
    render(
      <TechniqueDetailSheet
        open={true}
        technique={stubTechnique}
        onClose={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("OSL Base")).toBeInTheDocument();
    expect(screen.getByText("darkest tone")).toBeInTheDocument();
  });

  it("renders footer action buttons", () => {
    render(
      <TechniqueDetailSheet
        open={true}
        technique={stubTechnique}
        onClose={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByRole("button", { name: /Delete Technique/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Duplicate Technique/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit Technique/i })).toBeInTheDocument();
  });
});
