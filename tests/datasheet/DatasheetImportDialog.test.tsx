/**
 * Phase 15 — DatasheetImportDialog component tests.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DatasheetConflict } from "@/types/datasheet";
import { DatasheetImportDialog } from "@/features/units/DatasheetImportDialog";

describe("DatasheetImportDialog", () => {
  const conflicts: DatasheetConflict[] = [
    { key: "M", label: "M", currentValue: "5", incomingValue: "6", choice: "use" },
    { key: "abilities", label: "Personal Ability Notes", currentValue: "Old text", incomingValue: "Imported text", choice: "use" },
  ];

  it("DS-08: renders one field row per conflict; each row shows current value, incoming value, and Keep/Use buttons", () => {
    render(
      <DatasheetImportDialog
        open={true}
        conflicts={conflicts}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    // Two Keep + two Use datasheet buttons (one per row)
    expect(screen.getAllByRole("button", { name: "Keep" }).length).toBe(2);
    expect(screen.getAllByRole("button", { name: "Use datasheet" }).length).toBe(2);
    // Current and incoming values rendered
    expect(screen.getByText("Yours: 5")).toBeInTheDocument();
    expect(screen.getByText("Datasheet: 6")).toBeInTheDocument();
    expect(screen.getByText("Yours: Old text")).toBeInTheDocument();
    expect(screen.getByText("Datasheet: Imported text")).toBeInTheDocument();
    // Footer buttons
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply import" })).toBeInTheDocument();
    expect(screen.getByText("Review Import")).toBeInTheDocument();
  });

  it("DS-08: every row defaults to choice = 'use'; clicking Keep flips that row's choice; Apply import returns the resolution map via onConfirm", () => {
    const onConfirm = vi.fn();
    render(
      <DatasheetImportDialog
        open={true}
        conflicts={conflicts}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />
    );
    // Click "Keep" on the first conflict row (M)
    const keepButtons = screen.getAllByRole("button", { name: "Keep" });
    fireEvent.click(keepButtons[0]);
    // Click "Apply import"
    fireEvent.click(screen.getByRole("button", { name: "Apply import" }));
    // onConfirm is called with M: "keep" (just-clicked) and abilities: "use" (default)
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const resolution = onConfirm.mock.calls[0][0];
    expect(resolution.M).toBe("keep");
    expect(resolution.abilities).toBe("use");
    // Non-conflict keys (T, Sv, W, Ld, OC, keywords) default to "use" in the resolution map
    expect(resolution.T).toBe("use");
    expect(resolution.keywords).toBe("use");
  });
});
