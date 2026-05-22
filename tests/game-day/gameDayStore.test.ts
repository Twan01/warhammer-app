/**
 * Phase 56 — gameDayStore unit tests.
 *
 * Covers GAME-03: CP tracker store logic (spend, gain, undo, starting CP)
 * plus checklist and ability toggle operations.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useGameDayStore } from "@/features/game-day/gameDayStore";

describe("gameDayStore", () => {
  beforeEach(() => {
    useGameDayStore.setState({ listStates: {} });
  });

  describe("CP operations", () => {
    it("spendCp decrements CP by cost", () => {
      const store = useGameDayStore.getState();
      store.setStartingCp(1, 5);
      useGameDayStore.getState().spendCp(1, 2);

      const state = useGameDayStore.getState().listStates["1"];
      expect(state.cp).toBe(3);
      expect(state.cpHistory).toEqual([5]);
    });

    it("spendCp floors at 0 when cost > current CP", () => {
      const store = useGameDayStore.getState();
      store.setStartingCp(1, 2);
      useGameDayStore.getState().spendCp(1, 5);

      const state = useGameDayStore.getState().listStates["1"];
      expect(state.cp).toBe(0);
    });

    it("gainCp increments CP by 1", () => {
      const store = useGameDayStore.getState();
      store.setStartingCp(1, 3);
      useGameDayStore.getState().gainCp(1);

      const state = useGameDayStore.getState().listStates["1"];
      expect(state.cp).toBe(4);
      expect(state.cpHistory).toEqual([3]);
    });

    it("undoCp restores previous CP from history", () => {
      const store = useGameDayStore.getState();
      store.setStartingCp(1, 5);
      useGameDayStore.getState().spendCp(1, 2);
      useGameDayStore.getState().undoCp(1);

      const state = useGameDayStore.getState().listStates["1"];
      expect(state.cp).toBe(5);
      expect(state.cpHistory).toEqual([]);
    });

    it("undoCp is a no-op when cpHistory is empty", () => {
      const store = useGameDayStore.getState();
      store.setStartingCp(1, 5);
      useGameDayStore.getState().undoCp(1);

      const state = useGameDayStore.getState().listStates["1"];
      expect(state.cp).toBe(5);
      expect(state.cpHistory).toEqual([]);
    });

    it("setStartingCp sets both cp and startingCp", () => {
      const store = useGameDayStore.getState();
      store.setStartingCp(1, 3);

      const state = useGameDayStore.getState().listStates["1"];
      expect(state.cp).toBe(3);
      expect(state.startingCp).toBe(3);
      expect(state.cpHistory).toEqual([]);
    });
  });

  describe("getListState (default state)", () => {
    it("returns default state for unknown listId", () => {
      const state = useGameDayStore.getState().listStates["999"];
      expect(state).toBeUndefined();
    });
  });

  describe("checklist operations", () => {
    it("toggleChecklistItem flips checked boolean", () => {
      const store = useGameDayStore.getState();
      // Initialize list state by setting starting CP
      store.setStartingCp(1, 0);

      useGameDayStore.getState().toggleChecklistItem(1, "default-1");
      const state = useGameDayStore.getState().listStates["1"];
      const item = state.checklistItems.find((i) => i.id === "default-1");
      expect(item?.checked).toBe(true);

      useGameDayStore.getState().toggleChecklistItem(1, "default-1");
      const state2 = useGameDayStore.getState().listStates["1"];
      const item2 = state2.checklistItems.find((i) => i.id === "default-1");
      expect(item2?.checked).toBe(false);
    });

    it("addChecklistItem adds a new item", () => {
      const store = useGameDayStore.getState();
      store.setStartingCp(1, 0);

      useGameDayStore.getState().addChecklistItem(1, "Bring dice");
      const state = useGameDayStore.getState().listStates["1"];
      expect(state.checklistItems.length).toBe(6); // 5 default + 1 new
      expect(state.checklistItems[5].text).toBe("Bring dice");
      expect(state.checklistItems[5].checked).toBe(false);
    });

    it("resetChecklist unchecks all items", () => {
      const store = useGameDayStore.getState();
      store.setStartingCp(1, 0);

      // Check some items
      useGameDayStore.getState().toggleChecklistItem(1, "default-1");
      useGameDayStore.getState().toggleChecklistItem(1, "default-3");

      // Reset
      useGameDayStore.getState().resetChecklist(1);
      const state = useGameDayStore.getState().listStates["1"];
      expect(state.checklistItems.every((i) => i.checked === false)).toBe(true);
    });
  });

  describe("ability toggle", () => {
    it("toggleAbilityUsed adds and removes ability keys", () => {
      const store = useGameDayStore.getState();
      store.setStartingCp(1, 0);

      useGameDayStore.getState().toggleAbilityUsed(1, "ds1:ability-a");
      let state = useGameDayStore.getState().listStates["1"];
      expect(state.usedAbilities).toContain("ds1:ability-a");

      useGameDayStore.getState().toggleAbilityUsed(1, "ds1:ability-a");
      state = useGameDayStore.getState().listStates["1"];
      expect(state.usedAbilities).not.toContain("ds1:ability-a");
    });
  });
});
