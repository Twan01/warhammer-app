/**
 * Phase 134 HON-04 — CollectionFactionLinkDialog tests.
 *
 * Requirements tested:
 *   - Renders all UDB factions as SelectItem options
 *   - Confirm button is disabled when no selection is made
 *   - onConfirm is called with the STRING UDB faction id (never a Number/NaN)
 *   - Closing the dialog resets the selection
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { CollectionFactionLinkDialog } from "@/features/units/CollectionFactionLinkDialog";
import type { UdbFaction } from "@/db/queries/unitDatabase";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const udbFactions: UdbFaction[] = [
  { id: "SM", name: "Space Marines", short_name: "SM" },
  { id: "NEC", name: "Necrons", short_name: "NEC" },
  { id: "DG", name: "Death Guard", short_name: "DG" },
];

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  collectionFactionName: "My Space Marines",
  udbFactions,
  onConfirm: vi.fn(),
  isPending: false,
};

function renderDialog(props = {}) {
  return render(
    <CollectionFactionLinkDialog {...defaultProps} {...props} />,
    { wrapper },
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CollectionFactionLinkDialog — renders correctly", () => {
  it("renders the dialog title", () => {
    renderDialog();
    expect(screen.getByText("Match Faction to Database")).toBeInTheDocument();
  });

  it("renders the collection faction name in the description", () => {
    renderDialog();
    expect(screen.getByText("My Space Marines")).toBeInTheDocument();
  });

  it("renders all udbFactions as select options", async () => {
    const user = userEvent.setup();
    renderDialog();

    // Open the select
    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("option", { name: "Space Marines" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Necrons" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Death Guard" })).toBeInTheDocument();
  });
});

describe("CollectionFactionLinkDialog — confirm button state", () => {
  it("confirm button is disabled when no selection is made", () => {
    renderDialog();
    const confirmBtn = screen.getByRole("button", { name: /link & open datasheets/i });
    expect(confirmBtn).toBeDisabled();
  });

  it("confirm button is disabled when isPending is true (even with selection)", () => {
    renderDialog({ isPending: true });

    // Even without selection, isPending keeps it disabled
    const confirmBtn = screen.getByRole("button", { name: /link & open datasheets/i });
    expect(confirmBtn).toBeDisabled();
  });
});

describe("CollectionFactionLinkDialog — onConfirm receives STRING id", () => {
  it("calls onConfirm with the selected UDB faction id as a STRING (not Number/NaN)", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onConfirm });

    // Open the select and choose Space Marines (id: "SM")
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Space Marines" }));

    // Click confirm
    const confirmBtn = screen.getByRole("button", { name: /link & open datasheets/i });
    expect(confirmBtn).not.toBeDisabled();
    await user.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const calledWith = onConfirm.mock.calls[0][0];
    // Must be a string "SM", never a number or NaN
    expect(typeof calledWith).toBe("string");
    expect(calledWith).toBe("SM");
    expect(Number.isNaN(calledWith)).toBe(false);
  });

  it("calls onConfirm with string id for a second faction (NEC)", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onConfirm });

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Necrons" }));

    const confirmBtn = screen.getByRole("button", { name: /link & open datasheets/i });
    await user.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith("NEC");
    expect(typeof onConfirm.mock.calls[0][0]).toBe("string");
  });
});

describe("CollectionFactionLinkDialog — cancel button", () => {
  it("renders 'Cancel — browse all instead' button", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: /cancel — browse all instead/i })).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when cancel is clicked", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onOpenChange });

    await user.click(screen.getByRole("button", { name: /cancel — browse all instead/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
