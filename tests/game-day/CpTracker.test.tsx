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

  it("spendCp(1, 2) from cp=5 results in cp=3 and prevCp=5", () => {
    useGameDayStore.getState().setStartingCp(1, 5);
    useGameDayStore.getState().spendCp(1, 2);

    const state = useGameDayStore.getState().listStates["1"];
    expect(state.cp).toBe(3);
    expect(state.prevCp).toBe(5);
  });

  it("gainCp(1) from cp=3 results in cp=4", () => {
    useGameDayStore.getState().setStartingCp(1, 3);
    useGameDayStore.getState().gainCp(1);

    const state = useGameDayStore.getState().listStates["1"];
    expect(state.cp).toBe(4);
  });

  it("undoCp(1) restores prevCp value and sets prevCp to null", () => {
    useGameDayStore.getState().setStartingCp(1, 5);
    useGameDayStore.getState().spendCp(1, 2); // cp=3, prevCp=5
    useGameDayStore.getState().undoCp(1);

    const state = useGameDayStore.getState().listStates["1"];
    expect(state.cp).toBe(5);
    expect(state.prevCp).toBeNull();
  });

  it("setStartingCp(1, 3) sets both startingCp=3 and cp=3", () => {
    useGameDayStore.getState().setStartingCp(1, 3);

    const state = useGameDayStore.getState().listStates["1"];
    expect(state.startingCp).toBe(3);
    expect(state.cp).toBe(3);
  });

  it("multiple spends track only last prevCp", () => {
    useGameDayStore.getState().setStartingCp(1, 10);
    useGameDayStore.getState().spendCp(1, 2); // cp=8, prevCp=10
    useGameDayStore.getState().spendCp(1, 3); // cp=5, prevCp=8

    const state = useGameDayStore.getState().listStates["1"];
    expect(state.cp).toBe(5);
    expect(state.prevCp).toBe(8);
  });

  it("undo after undo is a no-op (prevCp already null)", () => {
    useGameDayStore.getState().setStartingCp(1, 5);
    useGameDayStore.getState().spendCp(1, 2);
    useGameDayStore.getState().undoCp(1); // cp=5, prevCp=null
    useGameDayStore.getState().undoCp(1); // no-op

    const state = useGameDayStore.getState().listStates["1"];
    expect(state.cp).toBe(5);
    expect(state.prevCp).toBeNull();
  });
});
