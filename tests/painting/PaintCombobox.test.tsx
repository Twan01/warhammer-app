/**
 * PAINT-04 — PaintCombobox filters paints by brand+name; shows owned indicator.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PaintCombobox } from "@/features/recipes/PaintCombobox";
import type { Paint } from "@/types/paint";
import { PAINTS_KEY } from "@/hooks/usePaints";

function makePaint(over: Partial<Paint> = {}): Paint {
  return {
    id: 1, brand: "Citadel", name: "Abaddon Black", paint_type: "Base",
    color_family: null, hex_color: null, owned: 1, quantity: null,
    running_low: 0, wishlist: 0, notes: null, purchase_price_pence: null,
    purchase_date: null,
    created_at: "2026-01-01", updated_at: "2026-01-01",
    ...over,
  };
}

function renderWithPaints(paints: Paint[], props: Partial<Parameters<typeof PaintCombobox>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(PAINTS_KEY, paints);
  const onChange = vi.fn();
  const utils = render(
    <QueryClientProvider client={qc}>
      <PaintCombobox value={null} onChange={onChange} {...props} />
    </QueryClientProvider>
  );
  return { ...utils, onChange };
}

describe("PaintCombobox", () => {
  it("PAINT-04: shows trigger label with selected paint when value is provided", () => {
    const paints = [makePaint({ id: 1, brand: "Citadel", name: "Abaddon Black" })];
    renderWithPaints(paints, { value: 1 });
    expect(screen.getByRole("combobox")).toHaveTextContent("Citadel Abaddon Black");
  });

  it("PAINT-04: shows placeholder 'Search paints...' when value is null", () => {
    renderWithPaints([], { value: null });
    expect(screen.getByRole("combobox")).toHaveTextContent("Search paints...");
  });

  it("PAINT-04: lists all paints when popover opens", async () => {
    const user = userEvent.setup();
    const paints = [
      makePaint({ id: 1, brand: "Citadel", name: "Abaddon Black" }),
      makePaint({ id: 2, brand: "Vallejo", name: "Black Ink" }),
    ];
    renderWithPaints(paints);
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByText("Citadel Abaddon Black")).toBeInTheDocument();
    expect(screen.getByText("Vallejo Black Ink")).toBeInTheDocument();
  });

  it("PAINT-04: filters by brand substring (case insensitive)", async () => {
    const user = userEvent.setup();
    const paints = [
      makePaint({ id: 1, brand: "Citadel", name: "Abaddon Black" }),
      makePaint({ id: 2, brand: "Vallejo", name: "Black Ink" }),
    ];
    renderWithPaints(paints);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Search paints..."), "vallejo");
    expect(screen.queryByText("Citadel Abaddon Black")).not.toBeInTheDocument();
    expect(screen.getByText("Vallejo Black Ink")).toBeInTheDocument();
  });

  it("PAINT-04: filters by name substring", async () => {
    const user = userEvent.setup();
    const paints = [
      makePaint({ id: 1, brand: "Citadel", name: "Abaddon Black" }),
      makePaint({ id: 2, brand: "Citadel", name: "White Scar" }),
    ];
    renderWithPaints(paints);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Search paints..."), "abad");
    expect(screen.getByText("Citadel Abaddon Black")).toBeInTheDocument();
    expect(screen.queryByText("Citadel White Scar")).not.toBeInTheDocument();
  });

  it("PAINT-04: shows CommandEmpty 'No paints found' when no match", async () => {
    const user = userEvent.setup();
    renderWithPaints([makePaint({ id: 1, brand: "Citadel", name: "Abaddon Black" })]);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Search paints..."), "zzz");
    expect(screen.getByText("No paints found. Add a new paint.")).toBeInTheDocument();
  });

  it("RECIPE-06: renders green dot for owned paints", async () => {
    const user = userEvent.setup();
    const paints = [makePaint({ id: 1, owned: 1 })];
    renderWithPaints(paints);
    await user.click(screen.getByRole("combobox"));
    // Popover renders in a portal outside container — use document.querySelector
    const dot = document.querySelector(".text-green-500");
    expect(dot).not.toBeNull();
  });

  it("RECIPE-06: renders red dot for unowned paints", async () => {
    const user = userEvent.setup();
    const paints = [makePaint({ id: 1, owned: 0 })];
    renderWithPaints(paints);
    await user.click(screen.getByRole("combobox"));
    // Popover renders in a portal outside container — use document.querySelector
    const dot = document.querySelector(".text-red-500");
    expect(dot).not.toBeNull();
  });

  it("calls onChange with paint.id when a paint is selected", async () => {
    const user = userEvent.setup();
    const paints = [makePaint({ id: 7, brand: "Citadel", name: "Abaddon Black" })];
    const { onChange } = renderWithPaints(paints);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("Citadel Abaddon Black"));
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("PAINT-03: renders 'Add new paint' option when onCreateNew is provided", async () => {
    const user = userEvent.setup();
    const onCreateNew = vi.fn();
    renderWithPaints([], { onCreateNew });
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByText("Add new paint")).toBeInTheDocument();
    await user.click(screen.getByText("Add new paint"));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it("PAINT-03: omits 'Add new paint' option when onCreateNew is not provided", async () => {
    const user = userEvent.setup();
    renderWithPaints([]);
    await user.click(screen.getByRole("combobox"));
    expect(screen.queryByText("Add new paint")).not.toBeInTheDocument();
  });
});
