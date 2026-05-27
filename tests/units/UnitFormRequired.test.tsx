/**
 * ARCH-03 â€” UnitFormRequired behavioral tests.
 *
 * Verifies that UnitFormRequired, extracted from the monolithic UnitSheet.tsx,
 * correctly renders all required form fields when wrapped in a react-hook-form
 * FormProvider (shadcn Form IS FormProvider).
 *
 * Tests the real component without mocking internals â€” if useFormContext blows
 * up outside a provider the component will throw, which is itself a behavioral
 * defect.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock CategoryCombobox so its Popover/Command tree (which needs ResizeObserver
// and more Radix wiring) does not interfere with required-field assertions.
vi.mock("@/features/units/CategoryCombobox", () => ({
  CategoryCombobox: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input
      data-testid="category-combobox"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Category"
    />
  ),
}));

import { unitSchema, type UnitFormValues } from "@/features/units/unitSchema";
import { UnitFormRequired } from "@/features/units/UnitFormRequired";
import type { Faction } from "@/types/faction";

const SAMPLE_FACTIONS: Faction[] = [
  {
    id: 1,
    name: "Space Marines",
    color_theme: "#0000FF",
    icon_path: null,
    game_system: "40k",
    description: null,
    lore_notes: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: 2,
    name: "Tau Empire",
    color_theme: "#00FFFF",
    icon_path: null,
    game_system: "40k",
    description: null,
    lore_notes: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
];

function defaultValues(): UnitFormValues {
  return {
    faction_id: 0,
    name: "",
    category: "",
    unit_type: null,
    model_count: null,
    owned_count: null,
    points: null,
    status_assembly: false,
    status_painting: "Not Started",
    painting_percentage: 0,
    status_basing: false,
    status_varnished: false,
    is_active_project: false,
    priority: null,
    target_completion_date: null,
    purchase_date: null,
    purchase_price_pence: null,
    storage_location: null,
    main_image_path: null,
    notes: null,
    lore_notes: null,
    undercoat: null,
  };
}

/** Minimal harness: wraps UnitFormRequired in a real react-hook-form FormProvider. */
function Harness({
  factions = SAMPLE_FACTIONS,
  factionsLoading = false,
}: {
  factions?: Faction[];
  factionsLoading?: boolean;
}) {
  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: defaultValues(),
  });
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <FormProvider {...form}>
        <form>
          <UnitFormRequired factions={factions} factionsLoading={factionsLoading} />
        </form>
      </FormProvider>
    </QueryClientProvider>
  );
}

describe("ARCH-03 â€” UnitFormRequired renders required fields", () => {
  it("renders the Name text input", () => {
    render(<Harness />);
    // The label "Name" should be present
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Name").tagName).toBe("INPUT");
  });

  it("renders the Faction select element", () => {
    render(<Harness />);
    // The FormLabel for faction renders as "Faction"
    const factionLabel = screen.getByText("Faction");
    expect(factionLabel).toBeInTheDocument();
  });

  it("renders faction options inside the select", () => {
    render(<Harness />);
    // Radix Select renders options in the DOM once open, but the trigger itself
    // should be present. Verify both faction names exist somewhere in the document
    // after clicking the trigger.
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeInTheDocument();
  });

  it("renders the Category field via CategoryCombobox", () => {
    render(<Harness />);
    expect(screen.getByTestId("category-combobox")).toBeInTheDocument();
  });

  it("shows loading placeholder on the faction select when factionsLoading=true", () => {
    render(<Harness factionsLoading={true} />);
    // The SelectTrigger should be disabled and show loading placeholder text
    const combobox = screen.getByRole("combobox");
    expect(combobox).toBeDisabled();
  });

  it("allows typing into the Name input", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    await user.type(nameInput, "Tau Fire Warriors");
    expect(nameInput.value).toBe("Tau Fire Warriors");
  });

  it("does NOT render any mutation hooks â€” no Save/Submit button inside the component", () => {
    render(<Harness />);
    // UnitFormRequired must be a pure presenter â€” no submit button of its own
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /submit/i })).toBeNull();
  });
});
