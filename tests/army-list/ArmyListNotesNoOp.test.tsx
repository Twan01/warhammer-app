/**
 * Phase 126 (FIX-03) -- Army list notes save no-op test.
 *
 * Verifies that saving notes when they haven't changed does NOT produce a toast
 * (no mutation is fired). Tests the ArmyListDetailPage handleSaveListNotes behavior.
 *
 * The implementation guards: if (notesDraft === (list.notes ?? "")) return;
 * We verify the updateArmyList mutation is NOT called when notes are unchanged.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockMutate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, ...props }: { children: ReactNode; to: string }) =>
    <a {...props}>{children}</a>,
}));

vi.mock("@/hooks/useArmyLists", () => ({
  useArmyList: () => ({
    data: { id: 1, name: "Test List", faction_id: 1, points_limit: 2000, notes: "existing notes", detachment_id: null, detachment_name: null, created_at: "2024-01-01", updated_at: "2024-01-01", list_type: null },
    isLoading: false,
  }),
  useArmyListWithUnits: () => ({ data: [], isLoading: false }),
  useRemoveUnitFromList: () => ({ mutate: vi.fn() }),
  useUpdateArmyList: () => ({ mutate: mockMutate, isPending: false }),
  useClearArmyListDetachment: () => ({ mutate: vi.fn() }),
  useEnhancementsByList: () => ({ data: [] }),
  useSetWarlord: () => ({ mutate: vi.fn() }),
  useClearWarlord: () => ({ mutate: vi.fn() }),
  useReorderArmyListUnits: () => ({ mutate: vi.fn() }),
  useAddUnitToList: () => ({ mutate: vi.fn() }),
  useListWargear: () => ({ data: [] }),
}));

vi.mock("@/hooks/useUnits", () => ({
  useUnits: () => ({ data: [] }),
}));

vi.mock("@/hooks/useUdbMeta", () => ({
  useUdbMeta: () => ({ data: null }),
}));

vi.mock("@/hooks/useLeaderTargets", () => ({
  useLeaderTargets: () => ({ data: [] }),
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({ data: [{ id: 1, name: "Space Marines" }] }),
}));

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  writeText: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeTextFile: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@/lib/exportArmyList", () => ({
  formatArmyListForExport: vi.fn(),
  buildClipboardText: vi.fn(),
  buildJsonFormat: vi.fn(),
  slugify: vi.fn(),
  dateStamp: vi.fn(),
}));

vi.mock("@/lib/exportArmyListPdf", () => ({
  generateArmyListPdf: vi.fn(),
}));

vi.mock("@/lib/groupUnitsWithLeaders", () => ({
  groupUnitsWithLeaders: () => [],
}));

// Mock sub-components to reduce noise
vi.mock("@/features/army-lists/ArmyListSummaryBar", () => ({
  ArmyListSummaryBar: () => <div data-testid="summary-bar" />,
}));
vi.mock("@/features/army-lists/ExportDropdown", () => ({
  ExportDropdown: () => <div data-testid="export-dropdown" />,
}));
vi.mock("@/features/army-lists/DetachmentPicker", () => ({
  DetachmentPicker: () => <div data-testid="detachment-picker" />,
}));
vi.mock("@/features/army-lists/DetachmentRulesSection", () => ({
  DetachmentRulesSection: () => null,
}));
vi.mock("@/features/army-lists/RemindersSection", () => ({
  RemindersSection: () => null,
}));
vi.mock("@/features/army-lists/ArmyListSheet", () => ({
  ArmyListSheet: () => null,
}));
vi.mock("@/features/army-lists/ArmyListDeleteDialog", () => ({
  ArmyListDeleteDialog: () => null,
}));
vi.mock("@/features/army-lists/UnitPickerDialog", () => ({
  UnitPickerDialog: () => null,
}));
vi.mock("@/features/army-lists/LoadoutBuilderSheet", () => ({
  LoadoutBuilderSheet: () => null,
}));
vi.mock("@/features/army-lists/EnhancementPickerSheet", () => ({
  EnhancementPickerSheet: () => null,
}));
vi.mock("@/features/army-lists/LeaderAttachmentSheet", () => ({
  LeaderAttachmentSheet: () => null,
}));
vi.mock("@/features/army-lists/DatasheetBrowserDialog", () => ({
  DatasheetBrowserDialog: () => null,
}));
vi.mock("@/features/army-lists/PrintPreviewDialog", () => ({
  PrintPreviewDialog: () => null,
}));
vi.mock("@/features/army-lists/SnapshotHistorySheet", () => ({
  SnapshotHistorySheet: () => null,
}));
vi.mock("@/features/army-lists/SnapshotCompareDialog", () => ({
  SnapshotCompareDialog: () => null,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { ArmyListDetailPage } from "@/features/army-lists/ArmyListDetailPage";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ArmyListDetailPage — FIX-03 notes no-op save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clicking 'Save notes' when notes are unchanged does NOT call updateArmyList", async () => {
    const user = userEvent.setup();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ArmyListDetailPage listId={1} />
      </QueryClientProvider>,
    );

    // The notes textarea should have the existing notes value
    const textarea = screen.getByPlaceholderText(/notes for this army list/i);
    expect(textarea).toHaveValue("existing notes");

    // Click save without changing anything
    const saveBtn = screen.getByRole("button", { name: /save notes/i });
    await user.click(saveBtn);

    // The mutation should NOT have been called
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("clicking 'Save notes' after changing notes DOES call updateArmyList", async () => {
    const user = userEvent.setup();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ArmyListDetailPage listId={1} />
      </QueryClientProvider>,
    );

    const textarea = screen.getByPlaceholderText(/notes for this army list/i);
    await user.clear(textarea);
    await user.type(textarea, "new notes");

    const saveBtn = screen.getByRole("button", { name: /save notes/i });
    await user.click(saveBtn);

    expect(mockMutate).toHaveBeenCalledOnce();
  });
});
