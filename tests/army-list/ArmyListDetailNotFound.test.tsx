/**
 * Phase 126 (FIX-10) -- ArmyListDetailPage not-found state test.
 *
 * Verifies that when useArmyList returns data: undefined and isLoading: false,
 * the page shows "List not found" message, NOT a loading skeleton.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, ...props }: { children: ReactNode; to: string }) =>
    <a {...props}>{children}</a>,
}));

vi.mock("@/hooks/useArmyLists", () => ({
  useArmyList: () => ({
    data: undefined,
    isLoading: false,
  }),
  useArmyListWithUnits: () => ({ data: [], isLoading: false }),
  useRemoveUnitFromList: () => ({ mutate: vi.fn() }),
  useUpdateArmyList: () => ({ mutate: vi.fn(), isPending: false }),
  useClearArmyListDetachment: () => ({ mutate: vi.fn() }),
  useEnhancementsByList: () => ({ data: [] }),
  useSetWarlord: () => ({ mutate: vi.fn() }),
  useClearWarlord: () => ({ mutate: vi.fn() }),
  useReorderArmyListUnits: () => ({ mutate: vi.fn() }),
  useAddUnitToList: () => ({ mutate: vi.fn() }),
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
  useFactions: () => ({ data: [] }),
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

vi.mock("@/lib/syncFreshness", () => ({
  getSyncFreshness: () => "fresh",
}));

vi.mock("@/lib/groupUnitsWithLeaders", () => ({
  groupUnitsWithLeaders: () => [],
}));

// Mock sub-components to reduce noise
vi.mock("@/features/army-lists/ArmyListSummaryBar", () => ({ ArmyListSummaryBar: () => null }));
vi.mock("@/features/army-lists/ExportDropdown", () => ({ ExportDropdown: () => null }));
vi.mock("@/features/army-lists/DetachmentPicker", () => ({ DetachmentPicker: () => null }));
vi.mock("@/features/army-lists/DetachmentRulesSection", () => ({ DetachmentRulesSection: () => null }));
vi.mock("@/features/army-lists/RemindersSection", () => ({ RemindersSection: () => null }));
vi.mock("@/features/army-lists/ArmyListSheet", () => ({ ArmyListSheet: () => null }));
vi.mock("@/features/army-lists/ArmyListDeleteDialog", () => ({ ArmyListDeleteDialog: () => null }));
vi.mock("@/features/army-lists/UnitPickerDialog", () => ({ UnitPickerDialog: () => null }));
vi.mock("@/features/army-lists/LoadoutBuilderSheet", () => ({ LoadoutBuilderSheet: () => null }));
vi.mock("@/features/army-lists/EnhancementPickerSheet", () => ({ EnhancementPickerSheet: () => null }));
vi.mock("@/features/army-lists/LeaderAttachmentSheet", () => ({ LeaderAttachmentSheet: () => null }));
vi.mock("@/features/army-lists/DatasheetBrowserDialog", () => ({ DatasheetBrowserDialog: () => null }));
vi.mock("@/features/army-lists/PrintPreviewDialog", () => ({ PrintPreviewDialog: () => null }));
vi.mock("@/features/army-lists/SnapshotHistorySheet", () => ({ SnapshotHistorySheet: () => null }));
vi.mock("@/features/army-lists/SnapshotCompareDialog", () => ({ SnapshotCompareDialog: () => null }));

import { ArmyListDetailPage } from "@/features/army-lists/ArmyListDetailPage";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ArmyListDetailPage — FIX-10 not-found state", () => {
  it("renders 'List not found' when list is undefined and not loading", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ArmyListDetailPage listId={999} />
      </QueryClientProvider>,
    );

    expect(screen.getByText("List not found")).toBeInTheDocument();
  });

  it("renders explanation text about deletion", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ArmyListDetailPage listId={999} />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/may have been deleted/i)).toBeInTheDocument();
  });

  it("renders Back to Army Lists link", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ArmyListDetailPage listId={999} />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/back to army lists/i)).toBeInTheDocument();
  });

  it("does NOT render loading skeleton when list is undefined", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ArmyListDetailPage listId={999} />
      </QueryClientProvider>,
    );

    // No skeleton elements (animate-pulse)
    const skeleton = document.querySelector(".animate-pulse");
    expect(skeleton).not.toBeInTheDocument();
  });
});
