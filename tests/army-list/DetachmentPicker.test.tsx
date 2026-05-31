/**
 * ARMY-01 -- DetachmentPicker: searchable Combobox scoped to faction.
 * Phase 107: detachment data source (rules.db) eliminated -- stub returns empty.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DetachmentPicker } from "@/features/army-lists/DetachmentPicker";

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

describe("DetachmentPicker", () => {
  it("ARMY-01: shows placeholder 'Select detachment...' when value is null", () => {
    renderPicker({ value: null, valueName: null });
    expect(screen.getByRole("combobox")).toHaveTextContent("Select detachment...");
  });

  it("ARMY-01: renders disabled button with 'Select a faction first' when disabled", () => {
    renderPicker({ disabled: true });
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent("Select a faction first");
  });

  it("ARMY-01: renders valueName when value is set", () => {
    renderPicker({ value: "DET001", valueName: "Gladius Task Force" });
    expect(screen.getByRole("combobox")).toHaveTextContent("Gladius Task Force");
  });

  it("ARMY-01: renders clear button when value is set", () => {
    renderPicker({ value: "DET001", valueName: "Gladius Task Force" });
    const clearBtn = screen.getByRole("button", { name: /clear/i });
    expect(clearBtn).toBeInTheDocument();
  });

  it("shows component without error when rulesSynced is false", () => {
    renderPicker({ rulesSynced: false });
    expect(screen.getByRole("combobox")).toHaveTextContent("Select detachment...");
  });
});
