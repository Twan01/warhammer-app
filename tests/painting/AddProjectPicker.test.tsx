/**
 * tech-debt:PaintingProjectsPage-DOM-query — AddProjectPicker controlled-props tests.
 *
 * Verifies that:
 * (a) AddProjectPicker renders a trigger button in uncontrolled mode (no props)
 * (b) When open=true is passed, the popover content is visible
 * (c) onOpenChange is called when the popover closes (Escape key)
 *
 * Mock strategy:
 * - vi.mock useUnits to avoid SQLite dependency
 * - vi.mock useUpdateUnit to avoid mutation calls
 * - vi.mock useQueryClient is provided via QueryClientProvider
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mock data hooks ──────────────────────────────────────────────────────────
vi.mock("@/hooks/useUnits", () => ({
  useUnits: () => ({ data: [] }),
  useUpdateUnit: () => ({ mutate: vi.fn(), isPending: false }),
  UNITS_KEY: ["units"],
}));

// ─── Import after mocks ───────────────────────────────────────────────────────
import { AddProjectPicker } from "@/features/painting-projects/AddProjectPicker";

function renderPicker(props: { open?: boolean; onOpenChange?: (open: boolean) => void } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AddProjectPicker {...props} />
    </QueryClientProvider>
  );
}

describe("AddProjectPicker — controlled-props behavior", () => {
  it("(a) renders the trigger button in uncontrolled mode (no props passed)", () => {
    renderPicker();
    // The trigger button is always visible regardless of popover state
    expect(screen.getByRole("button", { name: /add project/i })).toBeInTheDocument();
  });

  it("(b) popover content is visible when open=true is passed via controlled prop", () => {
    renderPicker({ open: true, onOpenChange: vi.fn() });
    // When open=true the Command search input inside PopoverContent is in the DOM
    expect(screen.getByPlaceholderText("Search units...")).toBeInTheDocument();
  });

  it("(c) popover content is NOT visible when open=false is passed via controlled prop", () => {
    renderPicker({ open: false, onOpenChange: vi.fn() });
    // When open=false PopoverContent is not rendered in the DOM
    expect(screen.queryByPlaceholderText("Search units...")).not.toBeInTheDocument();
  });

  it("(d) onOpenChange is called with false when Escape is pressed while popover is open", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderPicker({ open: true, onOpenChange });

    // Verify the popover is open
    expect(screen.getByPlaceholderText("Search units...")).toBeInTheDocument();

    // Press Escape — Radix Popover calls onOpenChange(false)
    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
