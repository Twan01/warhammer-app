/**
 * ERR-04 / D-08 -- Global error handlers capture uncaught errors
 * and unhandled promise rejections to console.error with structured context.
 */
import { describe, it, expect, vi } from "vitest";
import {
  handleGlobalError,
  handleUnhandledRejection,
} from "@/lib/globalErrorHandlers";

describe("Global error handlers — D-08", () => {
  it("handleGlobalError logs structured context with [GlobalError] prefix", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const testError = new Error("test error");
    testError.stack = "Error: test error\n    at test.ts:1:1";

    handleGlobalError("test error", "test.ts", 10, 5, testError);

    expect(spy).toHaveBeenCalledWith(
      "[GlobalError]",
      expect.objectContaining({
        type: "uncaught",
        message: "test error",
        source: "test.ts",
        location: "10:5",
        stack: expect.stringContaining("test error"),
        timestamp: expect.any(String),
      })
    );

    spy.mockRestore();
  });

  it("handleGlobalError handles missing optional params", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    handleGlobalError("bare error");

    expect(spy).toHaveBeenCalledWith(
      "[GlobalError]",
      expect.objectContaining({
        type: "uncaught",
        message: "bare error",
        location: "0:0",
      })
    );

    spy.mockRestore();
  });

  it("handleUnhandledRejection logs structured context for Error rejections", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const reason = new Error("test reject");
    reason.stack = "Error: test reject\n    at test.ts:2:2";

    handleUnhandledRejection({
      reason,
    } as PromiseRejectionEvent);

    expect(spy).toHaveBeenCalledWith(
      "[UnhandledRejection]",
      expect.objectContaining({
        type: "unhandledRejection",
        reason: "test reject",
        stack: expect.stringContaining("test reject"),
        timestamp: expect.any(String),
      })
    );

    spy.mockRestore();
  });

  it("handleUnhandledRejection handles non-Error rejections", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    handleUnhandledRejection({
      reason: "string rejection",
    } as PromiseRejectionEvent);

    expect(spy).toHaveBeenCalledWith(
      "[UnhandledRejection]",
      expect.objectContaining({
        type: "unhandledRejection",
        reason: "string rejection",
        stack: undefined,
      })
    );

    spy.mockRestore();
  });
});
