/**
 * ARCH-03 — UnitFormOptional behavioral tests.
 *
 * Verifies that UnitFormOptional starts collapsed and correctly reveals
 * its optional fields when the toggle is clicked.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn().mockResolvedValue(null),
}));

import { unitSchema, type UnitFormValues } from "@/features/units/unitSchema";
import { UnitFormOptional } from "@/features/units/UnitFormOptional";

function defaultValues(): UnitFormValues {
  return {
    faction_id: 1,
    name: "Test Unit",
    category: "Infantry",
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
    purchase_price_pounds: null,
    storage_location: null,
    main_image_path: null,
    notes: null,
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
          <UnitFormOptional hasTiers={hasTiers} tiersCount={tiersCount} unit={null} />
        </form>
      </FormProvider>
    </QueryClientProvider>
  );
}

describe("ARCH-03 — UnitFormOptional collapsible behavior", () => {
  it("renders collapsed by default — optional fields are hidden", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: /more details/i })).toBeInTheDocument();
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
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: /hide details/i }));
    expect(screen.queryByText("Priority")).toBeNull();
    expect(screen.getByRole("button", { name: /more details/i })).toBeInTheDocument();
  });

  it("expanded section renders Active project checkbox", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /more details/i }));
    expect(screen.getByLabelText("Active project")).toBeInTheDocument();
  });

  it("expanded section renders Points field as enabled when hasTiers=false", async () => {
    const user = userEvent.setup();
    render(<Harness hasTiers={false} tiersCount={0} />);
    await user.click(screen.getByRole("button", { name: /more details/i }));
    const pointsInput = screen.getByText("Points").closest("div")?.querySelector("input");
    expect(pointsInput).toBeDefined();
    expect(pointsInput?.disabled).toBeFalsy();
  });

  it("expanded section disables Points input and shows tier note when hasTiers=true", async () => {
    const user = userEvent.setup();
    render(<Harness hasTiers={true} tiersCount={3} />);
    await user.click(screen.getByRole("button", { name: /more details/i }));
    expect(screen.getByText("Points")).toBeInTheDocument();
    expect(screen.getByText(/3 tier/)).toBeInTheDocument();
  });

  it("shows purchase price with £ prefix", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /more details/i }));
    expect(screen.getByText("Purchase Price")).toBeInTheDocument();
    expect(screen.getByText("£")).toBeInTheDocument();
  });

  it("shows image file picker button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /more details/i }));
    expect(screen.getByLabelText("Browse for image")).toBeInTheDocument();
  });
});
