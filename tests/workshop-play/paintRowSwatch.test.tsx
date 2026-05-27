/** Wave 1 tests for WKSP-01 â€” PaintRow swatch consistency. */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { PaintRow } from "@/features/paints/PaintRow";
import type { PaintWithRecipeCount } from "@/types/paint";

// PaintRow renders TableRow/TableCell which require a table/tbody wrapper.
function renderInTable(ui: React.ReactElement) {
  return render(
    <table>
      <tbody>{ui}</tbody>
    </table>,
  );
}

function makePaint(overrides: Partial<PaintWithRecipeCount> = {}): PaintWithRecipeCount {
  return {
    id: 1,
    name: "Abaddon Black",
    brand: "Citadel",
    paint_type: "Base",
    hex_color: "#000000",
    color_family: "Black",
    owned: 1,
    quantity: null,
    running_low: 0,
    wishlist: 0,
    notes: null,
    purchase_price_pence: null,
    purchase_date: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    recipe_count: 0,
    ...overrides,
  };
}

describe("PaintRow swatch rendering (WKSP-01)", () => {
  it("renders a colored swatch span with backgroundColor when paint has hex_color", () => {
    const paint = makePaint({ hex_color: "#FF0000" });
    const { container } = renderInTable(
      <PaintRow
        paint={paint}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleOwned={vi.fn()}
        onRecipeBadgeClick={vi.fn()}
      />,
    );

    const swatch = container.querySelector('span[aria-hidden="true"]') as HTMLSpanElement;
    expect(swatch).toBeTruthy();
    // Browser normalises #FF0000 to rgb(255, 0, 0)
    expect(swatch.style.backgroundColor).toBeTruthy();
    expect(swatch.classList.contains("h-4")).toBe(true);
    expect(swatch.classList.contains("w-4")).toBe(true);
    expect(swatch.classList.contains("rounded-full")).toBe(true);
  });

  it("renders a muted fallback swatch when paint has no hex_color", () => {
    const paint = makePaint({ hex_color: null });
    const { container } = renderInTable(
      <PaintRow
        paint={paint}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleOwned={vi.fn()}
        onRecipeBadgeClick={vi.fn()}
      />,
    );

    const swatch = container.querySelector('span[aria-hidden="true"]') as HTMLSpanElement;
    expect(swatch).toBeTruthy();
    expect(swatch.classList.contains("bg-muted")).toBe(true);
    // No inline backgroundColor for fallback swatch
    expect(swatch.style.backgroundColor).toBe("");
  });

  it("swatch span is 16x16px (h-4 w-4) with rounded-full and border", () => {
    const paint = makePaint({ hex_color: "#000000" });
    const { container } = renderInTable(
      <PaintRow
        paint={paint}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleOwned={vi.fn()}
        onRecipeBadgeClick={vi.fn()}
      />,
    );

    const swatch = container.querySelector('span[aria-hidden="true"]') as HTMLSpanElement;
    expect(swatch).toBeTruthy();
    expect(swatch.classList.contains("h-4")).toBe(true);
    expect(swatch.classList.contains("w-4")).toBe(true);
    expect(swatch.classList.contains("rounded-full")).toBe(true);
    expect(swatch.classList.contains("border")).toBe(true);
    expect(swatch.classList.contains("border-border")).toBe(true);
  });
});
