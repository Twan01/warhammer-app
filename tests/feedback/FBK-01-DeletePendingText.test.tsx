/**
 * FBK-01: Delete dialogs show "Deleting..." when mutation isPending.
 *
 * Tests all 4 delete dialogs: Faction, BattleLog, Recipe, Paint.
 * Each must show "Deleting..." text when isPending is true and "Delete" when idle.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Shared mock state
// ---------------------------------------------------------------------------
let mockIsPending = false;

// ---------------------------------------------------------------------------
// Mock hooks — all delete hooks return a mutation with controllable isPending
// ---------------------------------------------------------------------------
vi.mock("@/hooks/useFactions", () => ({
  useDeleteFaction: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: mockIsPending,
  }),
}));

vi.mock("@/hooks/useBattleLogs", () => ({
  useDeleteBattleLog: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: mockIsPending,
  }),
}));

vi.mock("@/hooks/useRecipes", () => ({
  useDeleteRecipe: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: mockIsPending,
  }),
}));

vi.mock("@/hooks/usePaints", () => ({
  useDeletePaint: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: mockIsPending,
  }),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import { FactionDeleteDialog } from "@/features/factions/FactionDeleteDialog";
import { BattleLogDeleteDialog } from "@/features/battle-log/BattleLogDeleteDialog";
import { RecipeDeleteDialog } from "@/features/recipes/RecipeDeleteDialog";
import { PaintDeleteDialog } from "@/features/paints/PaintDeleteDialog";

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("FBK-01: Delete pending text", () => {
  describe("FactionDeleteDialog", () => {
    it("shows 'Delete' when idle", () => {
      mockIsPending = false;
      render(
        <FactionDeleteDialog
          open={true}
          faction={{ id: 1, name: "Test Faction", game_system: "Warhammer 40K", description: null, color_theme: "#000", icon_path: null, lore_notes: null, wahapedia_faction_id: null, created_at: "", updated_at: "" }}
          onClose={vi.fn()}
        />,
        { wrapper: Wrapper },
      );
      const button = screen.getByRole("button", { name: /delete/i });
      expect(button).toHaveTextContent("Delete");
      expect(button).not.toHaveTextContent("Deleting...");
    });

    it("shows 'Deleting...' when mutation is pending", () => {
      mockIsPending = true;
      render(
        <FactionDeleteDialog
          open={true}
          faction={{ id: 1, name: "Test Faction", game_system: "Warhammer 40K", description: null, color_theme: "#000", icon_path: null, lore_notes: null, wahapedia_faction_id: null, created_at: "", updated_at: "" }}
          onClose={vi.fn()}
        />,
        { wrapper: Wrapper },
      );
      expect(screen.getByText("Deleting...")).toBeInTheDocument();
    });
  });

  describe("BattleLogDeleteDialog", () => {
    it("shows 'Deleting...' when mutation is pending", () => {
      mockIsPending = true;
      render(
        <BattleLogDeleteDialog
          open={true}
          log={{ id: 1, battle_date: "2026-01-01", opponent_faction: "Orks", mission: "Hold", result: "Win", opponent: null, points_played: null, my_score: null, opponent_score: null, army_list_id: null, mvp_unit_id: null, underperforming_unit_id: null, lessons_learned: null, changes_next_time: null, notes: null, forgotten_rules: null, mvp_notes: null, underperformer_notes: null, created_at: "" }}
          onClose={vi.fn()}
        />,
        { wrapper: Wrapper },
      );
      expect(screen.getByText("Deleting...")).toBeInTheDocument();
    });
  });

  describe("RecipeDeleteDialog", () => {
    it("shows 'Deleting...' when mutation is pending", () => {
      mockIsPending = true;
      render(
        <RecipeDeleteDialog
          open={true}
          recipe={{ id: 1, name: "Test Recipe", faction_id: null, unit_id: null, area: null, primer: null, basecoat: null, shade: null, layer: null, highlight: null, glaze_filter: null, weathering: null, technical: null, basing: null, notes: null, tutorial_link: null, style: null, surface: null, effect: null, difficulty: null, estimated_minutes: null, result_photo_path: null, created_at: "", updated_at: "" }}
          onClose={vi.fn()}
        />,
        { wrapper: Wrapper },
      );
      expect(screen.getByText("Deleting...")).toBeInTheDocument();
    });

    it("shows 'Delete' not 'Delete recipe' when idle", () => {
      mockIsPending = false;
      render(
        <RecipeDeleteDialog
          open={true}
          recipe={{ id: 1, name: "Test Recipe", faction_id: null, unit_id: null, area: null, primer: null, basecoat: null, shade: null, layer: null, highlight: null, glaze_filter: null, weathering: null, technical: null, basing: null, notes: null, tutorial_link: null, style: null, surface: null, effect: null, difficulty: null, estimated_minutes: null, result_photo_path: null, created_at: "", updated_at: "" }}
          onClose={vi.fn()}
        />,
        { wrapper: Wrapper },
      );
      const destructiveButton = screen.getByRole("button", { name: /delete/i });
      // Should be "Delete" exactly, not "Delete recipe"
      expect(destructiveButton.textContent?.trim()).toBe("Delete");
    });
  });

  describe("PaintDeleteDialog", () => {
    it("shows 'Deleting...' when mutation is pending", () => {
      mockIsPending = true;
      render(
        <PaintDeleteDialog
          open={true}
          paint={{ id: 1, brand: "Citadel", name: "Black", paint_type: "Base", color_family: null, hex_color: null, owned: 1, quantity: null, running_low: 0, wishlist: 0, notes: null, purchase_price_pence: null, purchase_date: null, created_at: "", updated_at: "" }}
          onClose={vi.fn()}
        />,
        { wrapper: Wrapper },
      );
      expect(screen.getByText("Deleting...")).toBeInTheDocument();
    });
  });
});
