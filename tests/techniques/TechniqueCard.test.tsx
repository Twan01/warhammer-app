// @vitest-environment jsdom

/**
 * Nyquist test: TechniqueCard component (LIB-02).
 *
 * Renders TechniqueCard with stub TechniqueWithCounts objects and asserts
 * that all key display elements appear: name, usage line, slot/step counts,
 * effect badge, difficulty badge, and action buttons.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TechniqueCard } from "@/features/techniques/TechniqueCard";
import type { TechniqueWithCounts } from "@/types/technique";

const makeTechnique = (partial: Partial<TechniqueWithCounts> & { id: number; name: string }): TechniqueWithCounts => ({
  id: partial.id,
  name: partial.name,
  effect: partial.effect ?? null,
  difficulty: partial.difficulty ?? null,
  notes: null,
  created_at: "2026-06-21T00:00:00Z",
  updated_at: "2026-06-21T00:00:00Z",
  slot_count: partial.slot_count ?? 0,
  step_count: partial.step_count ?? 0,
  usage_count: partial.usage_count ?? 0,
});

describe("TechniqueCard (LIB-02)", () => {
  const noop = vi.fn();

  it("renders the technique name", () => {
    const t = makeTechnique({ id: 1, name: "OSL Glow" });
    render(<TechniqueCard technique={t} onClick={noop} onEdit={noop} onDelete={noop} onDuplicate={noop} />);
    expect(screen.getByText("OSL Glow")).toBeInTheDocument();
  });

  it("shows 'Not used yet' when usage_count is 0", () => {
    const t = makeTechnique({ id: 1, name: "OSL Glow", usage_count: 0 });
    render(<TechniqueCard technique={t} onClick={noop} onEdit={noop} onDelete={noop} onDuplicate={noop} />);
    expect(screen.getByText("Not used yet")).toBeInTheDocument();
  });

  it("shows 'Used by N recipes' when usage_count > 0", () => {
    const t = makeTechnique({ id: 1, name: "NMM Gold", usage_count: 3 });
    render(<TechniqueCard technique={t} onClick={noop} onEdit={noop} onDelete={noop} onDuplicate={noop} />);
    expect(screen.getByText("Used by 3 recipes")).toBeInTheDocument();
  });

  it("shows singular 'recipe' when usage_count is 1", () => {
    const t = makeTechnique({ id: 1, name: "OSL Glow", usage_count: 1 });
    render(<TechniqueCard technique={t} onClick={noop} onEdit={noop} onDelete={noop} onDuplicate={noop} />);
    expect(screen.getByText("Used by 1 recipe")).toBeInTheDocument();
  });

  it("shows slot count", () => {
    const t = makeTechnique({ id: 1, name: "OSL Glow", slot_count: 2 });
    render(<TechniqueCard technique={t} onClick={noop} onEdit={noop} onDelete={noop} onDuplicate={noop} />);
    expect(screen.getByText("2 slots")).toBeInTheDocument();
  });

  it("shows singular 'slot' when slot_count is 1", () => {
    const t = makeTechnique({ id: 1, name: "OSL Glow", slot_count: 1 });
    render(<TechniqueCard technique={t} onClick={noop} onEdit={noop} onDelete={noop} onDuplicate={noop} />);
    expect(screen.getByText("1 slot")).toBeInTheDocument();
  });

  it("shows step count", () => {
    const t = makeTechnique({ id: 1, name: "OSL Glow", step_count: 5 });
    render(<TechniqueCard technique={t} onClick={noop} onEdit={noop} onDelete={noop} onDuplicate={noop} />);
    expect(screen.getByText("5 steps")).toBeInTheDocument();
  });

  it("shows difficulty badge", () => {
    const t = makeTechnique({ id: 1, name: "OSL Glow", difficulty: "Advanced" });
    render(<TechniqueCard technique={t} onClick={noop} onEdit={noop} onDelete={noop} onDuplicate={noop} />);
    expect(screen.getByText("Advanced")).toBeInTheDocument();
  });

  it("shows effect badge", () => {
    const t = makeTechnique({ id: 1, name: "OSL Glow", effect: "OSL" });
    render(<TechniqueCard technique={t} onClick={noop} onEdit={noop} onDelete={noop} onDuplicate={noop} />);
    expect(screen.getByText("OSL")).toBeInTheDocument();
  });

  it("renders Edit, Duplicate, and Delete action buttons", () => {
    const t = makeTechnique({ id: 1, name: "OSL Glow" });
    render(<TechniqueCard technique={t} onClick={noop} onEdit={noop} onDelete={noop} onDuplicate={noop} />);
    expect(screen.getByRole("button", { name: "Edit technique" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Duplicate technique" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete technique" })).toBeInTheDocument();
  });

  it("calls onClick when card is clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    const t = makeTechnique({ id: 1, name: "OSL Glow" });
    render(<TechniqueCard technique={t} onClick={handleClick} onEdit={noop} onDelete={noop} onDuplicate={noop} />);
    // Card renders as a div with aria-label — click by label query
    const card = screen.getByLabelText("View OSL Glow");
    await user.click(card);
    expect(handleClick).toHaveBeenCalledWith(t);
  });

  it("calls onEdit when Edit button is clicked", async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const t = makeTechnique({ id: 1, name: "OSL Glow" });
    render(<TechniqueCard technique={t} onClick={noop} onEdit={handleEdit} onDelete={noop} onDuplicate={noop} />);
    await user.click(screen.getByRole("button", { name: "Edit technique" }));
    expect(handleEdit).toHaveBeenCalledWith(t);
  });

  it("calls onDelete when Delete button is clicked", async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();
    const t = makeTechnique({ id: 1, name: "OSL Glow" });
    render(<TechniqueCard technique={t} onClick={noop} onEdit={noop} onDelete={handleDelete} onDuplicate={noop} />);
    await user.click(screen.getByRole("button", { name: "Delete technique" }));
    expect(handleDelete).toHaveBeenCalledWith(t);
  });

  it("does not show faction or swatch strip (no recipe-level fields)", () => {
    const t = makeTechnique({ id: 1, name: "OSL Glow" });
    const { container } = render(
      <TechniqueCard technique={t} onClick={noop} onEdit={noop} onDelete={noop} onDuplicate={noop} />,
    );
    // No faction badge data-testid or swatch-dot
    expect(container.querySelector("[data-testid='faction-badge']")).toBeNull();
    expect(container.querySelector("[data-testid='swatch-dot']")).toBeNull();
  });
});
