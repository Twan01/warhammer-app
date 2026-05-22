/**
 * Phase 56 — CP tracker store tests (direct unit tests).
 *
 * Covers GAME-03: CP spend/gain/undo/starting CP operations
 * with specific value assertions matching plan acceptance criteria.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useGameDayStore } from "@/features/game-day/gameDayStore";

describe("CpTracker", () => {
  beforeEach(() => {
    useGameDayStore.setState({ listStates: {} });
  });

  it("spendCp(1, 2) from cp=5 results in cp=3 and cpHistory=[5]", () => {
    useGameDayStore.getState().setStartingCp(1, 5);
    useGameDayStore.getState().spendCp(1, 2);

    const state = useGameDayStore.getState().listStates["1"];
    expect(state.cp).toBe(3);
    expect(state.cpHistory).toEqual([5]);
  });

  it("gainCp(1) from cp=3 results in cp=4", () => {
    useGameDayStore.getState().setStartingCp(1, 3);
    useGameDayStore.getState().gainCp(1);

    const state = useGameDayStore.getState().listStates["1"];
    expect(state.cp).toBe(4);
  });

  it("undoCp(1) restores previous value from cpHistory", () => {
    useGameDayStore.getState().setStartingCp(1, 5);
    useGameDayStore.getState().spendCp(1, 2); // cp=3, cpHistory=[5]
    useGameDayStore.getState().undoCp(1);

    const state = useGameDayStore.getState().listStates["1"];
    expect(state.cp).toBe(5);
    expect(state.cpHistory).toEqual([]);
  });

  it("setStartingCp(1, 3) sets both startingCp=3 and cp=3", () => {
    useGameDayStore.getState().setStartingCp(1, 3);

    const state = useGameDayStore.getState().listStates["1"];
    expect(state.startingCp).toBe(3);
    expect(state.cp).toBe(3);
  });

  it("multiple spends build cpHistory stack", () => {
    useGameDayStore.getState().setStartingCp(1, 10);
    useGameDayStore.getState().spendCp(1, 2); // cp=8, cpHistory=[10]
    useGameDayStore.getState().spendCp(1, 3); // cp=5, cpHistory=[10,8]

    const state = useGameDayStore.getState().listStates["1"];
    expect(state.cp).toBe(5);
    expect(state.cpHistory).toEqual([10, 8]);
  });

  it("undo after undo pops full history", () => {
    useGameDayStore.getState().setStartingCp(1, 5);
    useGameDayStore.getState().spendCp(1, 2); // cp=3, cpHistory=[5]
    useGameDayStore.getState().undoCp(1); // cp=5, cpHistory=[]
    useGameDayStore.getState().undoCp(1); // no-op, cpHistory empty

    const state = useGameDayStore.getState().listStates["1"];
    expect(state.cp).toBe(5);
    expect(state.cpHistory).toEqual([]);
  });
});
