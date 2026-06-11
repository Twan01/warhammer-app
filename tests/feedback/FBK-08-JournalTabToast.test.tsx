/**
 * FBK-08: JournalTab session create fires toast.success("Session logged.").
 *
 * Static source analysis verifying toast.success call exists in handleLogSession.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const SRC = readFileSync(
  resolve(__dirname, "../../src/features/units/JournalTab.tsx"),
  "utf-8",
);

describe("FBK-08: JournalTab session create toast", () => {
  it("calls toast.success with 'Session logged.' after mutateAsync", () => {
    // The handleLogSession function should contain toast.success("Session logged.")
    // after the createSession.mutateAsync call
    expect(SRC).toContain('toast.success("Session logged.")');
  });

  it("toast.success call is inside handleLogSession (after mutateAsync, before form reset)", () => {
    const fnBody = SRC.match(/async function handleLogSession[\s\S]*?^  \}/m);
    expect(fnBody).not.toBeNull();
    const body = fnBody![0];
    const mutateIdx = body.indexOf("mutateAsync");
    const toastIdx = body.indexOf('toast.success("Session logged.")');
    const resetIdx = body.indexOf("setSessionDate");
    // toast should come after mutateAsync and before or at reset
    expect(mutateIdx).toBeGreaterThan(-1);
    expect(toastIdx).toBeGreaterThan(mutateIdx);
    expect(resetIdx).toBeGreaterThan(toastIdx);
  });
});
