/**
 * COLL-10 — optimistic status update with rollback on error.
 * Tests the StatusPopover component's optimistic cache update and rollback contract.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { StatusPopover } from "@/features/units/StatusPopover";
import { UNITS_KEY } from "@/hooks/useUnits";
import type { Unit } from "@/types/unit";

// Mock the underlying SQL query so useUpdateUnit calls a stub instead of hitting SQLite.
vi.mock("@/db/queries/units", async () => {
  return {
    getUnits: vi.fn(async () => []),
    getUnitById: vi.fn(async () => null),
    createUnit: vi.fn(async () => 0),
    updateUnit: vi.fn(),
    deleteUnit: vi.fn(),
  };
});

import * as queries from "@/db/queries/units";

const updateUnitMock = queries.updateUnit as unknown as ReturnType<typeof vi.fn>;

function makeUnit(over: Partial<Unit> = {}): Unit {
  return {
    id: 42,
    faction_id: 1,
    name: "Fire Warriors",
    category: "Battleline",
    unit_type: null,
    model_count: 10,
    owned_count: 10,
    points: 100,
    status_assembly: 1,
    status_painting: "Built",
    painting_percentage: 25,
    status_basing: 0,
    status_varnished: 0,
    is_active_project: 0,
    priority: null,
    target_completion_date: null,
    purchase_date: null,
    purchase_price_pence: null,
    storage_location: null,
    main_image_path: null,
    notes: null,
    lore_notes: null,
    undercoat: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...over,
  };
}

function setup(unit: Unit) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  qc.setQueryData(UNITS_KEY, [unit]);
  const utils = render(
    <QueryClientProvider client={qc}>
      <StatusPopover unit={unit} />
      <Toaster />
    </QueryClientProvider>
  );
  return { qc, ...utils };
}

describe("StatusPopover", () => {
  beforeEach(() => {
    updateUnitMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens popover when badge is clicked", async () => {
    const user = userEvent.setup();
    setup(makeUnit());
    const trigger = screen.getByRole("button", {
      name: /Change status for Fire Warriors, currently Built/i,
    });
    await user.click(trigger);
    // Both "Built" appear once (current) and other statuses appear once each in the list
    expect(screen.getByRole("option", { name: /Primed/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Completed/i })).toBeInTheDocument();
  });

  it("optimistically updates query cache on selection", async () => {
    const user = userEvent.setup();
    // Make updateUnit hang so we can observe the optimistic state
    updateUnitMock.mockImplementation(() => new Promise(() => { /* never resolves */ }));
    const { qc } = setup(makeUnit({ status_painting: "Built" }));
    await user.click(screen.getByRole("button", { name: /Change status for Fire Warriors/i }));
    await user.click(screen.getByRole("option", { name: /Primed/i }));
    const cached = qc.getQueryData<Unit[]>(UNITS_KEY) ?? [];
    expect(cached[0].status_painting).toBe("Primed");
  });

  it("rolls back cache when mutation rejects", async () => {
    const user = userEvent.setup();
    updateUnitMock.mockRejectedValue(new Error("DB failure"));
    const { qc } = setup(makeUnit({ status_painting: "Built" }));
    await user.click(screen.getByRole("button", { name: /Change status for Fire Warriors/i }));
    await user.click(screen.getByRole("option", { name: /Primed/i }));
    // Wait a microtask cycle for the rejected mutation to complete its onError handler
    await vi.waitFor(() => {
      const cached = qc.getQueryData<Unit[]>(UNITS_KEY) ?? [];
      expect(cached[0].status_painting).toBe("Built");
    });
  });

  it("shows Sonner error toast on mutation failure", async () => {
    const user = userEvent.setup();
    updateUnitMock.mockRejectedValue(new Error("DB failure"));
    const errorSpy = vi.spyOn(toast, "error");
    setup(makeUnit({ status_painting: "Built" }));
    await user.click(screen.getByRole("button", { name: /Change status for Fire Warriors/i }));
    await user.click(screen.getByRole("option", { name: /Primed/i }));
    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        "Status update failed. The change has been reverted."
      );
    });
    errorSpy.mockRestore();
  });
});
