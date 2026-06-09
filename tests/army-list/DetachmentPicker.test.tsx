/**
 * Phase 120 — ARMY-01, DET-03: DetachmentPicker component tests.
 *
 * Phase 120: wired to useDetachmentsByFaction from @/hooks/useGameData.
 * Mock must target @/hooks/useGameData, not a local stub.
 * Tests verify real UdbDetachment data renders in the combobox,
 * plus all guard states (disabled, no faction, empty list).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DetachmentPicker } from "@/features/army-lists/DetachmentPicker";
import type { UdbDetachment } from "@/types/gameData";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useGameData", () => ({
  useDetachmentsByFaction: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockDetachments: UdbDetachment[] = [
  { id: "det-gladius", faction_id: "SM", name: "Gladius Task Force" },
  { id: "det-ironstorm", faction_id: "SM", name: "Ironstorm Spearhead" },
  { id: "det-stormlance", faction_id: "SM", name: "Stormlance Task Force" },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function setupDetachmentsMock(detachments: UdbDetachment[] = mockDetachments) {
  const { useDetachmentsByFaction } = await import("@/hooks/useGameData");
  vi.mocked(useDetachmentsByFaction).mockReturnValue({
    data: detachments,
    isLoading: false,
  } as unknown as ReturnType<typeof useDetachmentsByFaction>);
}

function renderPicker(
  props: Partial<Parameters<typeof DetachmentPicker>[0]> = {},
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onChange = vi.fn();
  const onClear = vi.fn();
  const utils = render(
    <QueryClientProvider client={qc}>
      <DetachmentPicker
        factionWahapediaId="SM"
        value={null}
        valueName={null}
        disabled={false}
        rulesSynced={true}
        onChange={onChange}
        onClear={onClear}
        {...props}
      />
    </QueryClientProvider>,
  );
  return { ...utils, onChange, onClear };
}

// ---------------------------------------------------------------------------
// Tests: DET-03 — real UdbDetachment data renders
// ---------------------------------------------------------------------------

describe("DetachmentPicker — DET-03 renders real detachments from useDetachmentsByFaction", () => {
  it("shows placeholder 'Select detachment...' when value is null", async () => {
    await setupDetachmentsMock();
    renderPicker({ value: null, valueName: null });
    expect(screen.getByRole("combobox")).toHaveTextContent("Select detachment...");
  });

  it("renders detachment names from useDetachmentsByFaction in the dropdown", async () => {
    await setupDetachmentsMock();
    const user = userEvent.setup();
    renderPicker();

    // Open the combobox
    await user.click(screen.getByRole("combobox"));

    // All three detachments from the mock should appear
    expect(screen.getByText("Gladius Task Force")).toBeInTheDocument();
    expect(screen.getByText("Ironstorm Spearhead")).toBeInTheDocument();
    expect(screen.getByText("Stormlance Task Force")).toBeInTheDocument();
  });

  it("calls onChange with detachment id and name when a detachment is selected", async () => {
    await setupDetachmentsMock();
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("Gladius Task Force"));

    expect(onChange).toHaveBeenCalledWith("det-gladius", "Gladius Task Force");
  });

  it("renders valueName in button when value is set", async () => {
    await setupDetachmentsMock();
    renderPicker({ value: "det-gladius", valueName: "Gladius Task Force" });
    expect(screen.getByRole("combobox")).toHaveTextContent("Gladius Task Force");
  });

  it("renders clear button when value is set", async () => {
    await setupDetachmentsMock();
    renderPicker({ value: "det-gladius", valueName: "Gladius Task Force" });
    const clearBtn = screen.getByRole("button", { name: /clear/i });
    expect(clearBtn).toBeInTheDocument();
  });

  it("calls onClear when clear button is clicked", async () => {
    await setupDetachmentsMock();
    const user = userEvent.setup();
    const { onClear } = renderPicker({ value: "det-gladius", valueName: "Gladius Task Force" });

    const clearBtn = screen.getByRole("button", { name: /clear/i });
    await user.click(clearBtn);

    expect(onClear).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: Guard states
// ---------------------------------------------------------------------------

describe("DetachmentPicker — guard states", () => {
  it("renders disabled button with 'Select a faction first' when disabled=true", async () => {
    await setupDetachmentsMock();
    renderPicker({ disabled: true });
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent("Select a faction first");
  });

  it("shows 'Import unit database to load detachments' when rulesSynced is false and list is empty", async () => {
    const { useDetachmentsByFaction } = await import("@/hooks/useGameData");
    vi.mocked(useDetachmentsByFaction).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useDetachmentsByFaction>);

    const user = userEvent.setup();
    renderPicker({ rulesSynced: false });

    await user.click(screen.getByRole("combobox"));
    expect(screen.getByText(/import unit database to load detachments/i)).toBeInTheDocument();
  });

  it("does NOT call useDetachmentsByFaction with a real faction ID when disabled=true", async () => {
    const { useDetachmentsByFaction } = await import("@/hooks/useGameData");
    vi.mocked(useDetachmentsByFaction).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useDetachmentsByFaction>);

    renderPicker({ disabled: true, factionWahapediaId: "SM" });

    // When disabled, the hook should be called with undefined (not "SM")
    expect(vi.mocked(useDetachmentsByFaction)).toHaveBeenCalledWith(undefined);
  });
});
