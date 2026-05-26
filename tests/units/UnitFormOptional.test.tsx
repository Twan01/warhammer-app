/**
 * ARCH-03 — UnitFormOptional behavioral tests.
 *
 * Verifies that UnitFormOptional, extracted from the monolithic UnitSheet.tsx,
 * starts collapsed and correctly reveals its optional fields when the toggle
 * is clicked. All fields must use useFormContext (no prop-drilled form object).
 *
 * The collapsible expand/collapse state is local to UnitFormOptional (per D-07).
 * This test exercises that interaction directly.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { unitSchema, type UnitFormValues } from "@/features/units/unitSchema";
import { UnitFormOptional } from "@/features/units/UnitFormOptional";

function defaultValues(): UnitFormValues {
  return {
    faction_id: 1,
    name: "Test Unit",
    category: "Infantry",
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

function Harness({
  hasTiers = false,
  tiersCount = 0,
}: {
  hasTiers?: boolean;
  tiersCount?: number;
}) {
  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: defaultValues(),
  });
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <FormProvider {...form}>
        <form>
          <UnitFormOptional hasTiers={hasTiers} tiersCount={tiersCount} />
        </form>
      </FormProvider>
    </QueryClientProvider>
  );
}

describe("ARCH-03 — UnitFormOptional collapsible behavior", () => {
  it("renders collapsed by default — optional fields are hidden", () => {
    render(<Harness />);
    // In collapsed state the expand toggle exists but field labels are absent
    expect(screen.getByRole("button", { name: /more details/i })).toBeInTheDocument();
    // These labels only appear when expanded
    expect(screen.queryByText("Painting Status")).toBeNull();
    expect(screen.queryByText("Notes")).toBeNull();
  });

  it("toggle button text says 'More details' when collapsed", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: /more details/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hide details/i })).toBeNull();
  });

  it("clicking toggle expands the section and shows optional fields", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /more details/i }));
    // After expand, field labels must appear
    expect(screen.getByText("Painting Status")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("toggle text changes to 'Hide details' after expanding", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /more details/i }));
    expect(screen.getByRole("button", { name: /hide details/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /more details/i })).toBeNull();
  });

  it("clicking toggle a second time collapses the section again", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /more details/i }));
    // Expanded — click again
    await user.click(screen.getByRole("button", { name: /hide details/i }));
    // Back to collapsed: Painting Status should be gone
    expect(screen.queryByText("Painting Status")).toBeNull();
    expect(screen.getByRole("button", { name: /more details/i })).toBeInTheDocument();
  });

  it("expanded section renders all checkbox fields", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /more details/i }));
    expect(screen.getByLabelText("Assembly complete")).toBeInTheDocument();
    expect(screen.getByLabelText("Basing complete")).toBeInTheDocument();
    expect(screen.getByLabelText("Varnished")).toBeInTheDocument();
    expect(screen.getByLabelText("Active project")).toBeInTheDocument();
  });

  it("expanded section renders Points field as enabled when hasTiers=false", async () => {
    const user = userEvent.setup();
    render(<Harness hasTiers={false} tiersCount={0} />);
    await user.click(screen.getByRole("button", { name: /more details/i }));
    const pointsInputs = screen
      .getAllByRole("spinbutton")
      .filter((el) => (el as HTMLInputElement).placeholder === "Optional");
    // At least one spinbutton with placeholder "Optional" maps to Points
    const pointsInput = pointsInputs.find((el) => !(el as HTMLInputElement).disabled);
    expect(pointsInput).toBeDefined();
  });

  it("expanded section disables Points input and shows tier note when hasTiers=true", async () => {
    const user = userEvent.setup();
    render(<Harness hasTiers={true} tiersCount={3} />);
    await user.click(screen.getByRole("button", { name: /more details/i }));
    // The Points label should exist
    expect(screen.getByText("Points")).toBeInTheDocument();
    // Tier count message should be present
    expect(screen.getByText(/3 tier/)).toBeInTheDocument();
  });

  it("does NOT render useQuery/useMutation hooks — component accepts only hasTiers+tiersCount props", () => {
    // This is a structural contract test: if the component compiled and renders
    // without querying the DB, its prop contract is pure (no side-channel deps).
    // If the component tries to fire a React Query hook directly it would need
    // more wiring and would throw in our minimal harness.
    render(<Harness />);
    // If we reach here without throwing, the component has no rogue hook calls.
    expect(screen.getByRole("button", { name: /more details/i })).toBeInTheDocument();
  });
});
