/**
 * REL-08 / D-07 -- logFrontend is a best-effort, infallible wrapper around
 * invoke("append_frontend_log"). It must never throw into the caller and must
 * fire-and-forget with the correct argument shape.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...a: unknown[]) => mockInvoke(...a),
}));

import { logFrontend } from "@/lib/frontendLog";

describe("logFrontend — REL-08 / D-07", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(undefined);
  });

  it("calls invoke with command append_frontend_log and the correct line arg", async () => {
    logFrontend("x");
    // Let the microtask queue flush so the promise chain runs.
    await Promise.resolve();
    expect(mockInvoke).toHaveBeenCalledOnce();
    expect(mockInvoke).toHaveBeenCalledWith("append_frontend_log", { line: "x" });
  });

  it("does not throw when invoke rejects", async () => {
    mockInvoke.mockRejectedValue(new Error("boom"));
    // logFrontend must not throw synchronously.
    expect(() => logFrontend("error line")).not.toThrow();
    // Let any microtask rejection run — must remain swallowed (no unhandled rejection).
    await Promise.resolve();
    // If we reach here without Vitest reporting an unhandled rejection, the catch worked.
    expect(mockInvoke).toHaveBeenCalledOnce();
  });

  it("returns void synchronously (not a promise that callers must await)", () => {
    const result = logFrontend("sync check");
    expect(result).toBeUndefined();
  });
});
