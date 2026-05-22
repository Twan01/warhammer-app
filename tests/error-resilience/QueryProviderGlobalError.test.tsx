/**
 * ERR-04 / D-09 -- QueryProvider wires QueryCache and MutationCache onError
 * handlers that log failed queries and mutations to console.error.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { QueryProvider } from "@/components/common/QueryProvider";

let capturedClient: ReturnType<typeof useQueryClient> | null = null;

function Inspector() {
  capturedClient = useQueryClient();
  return <span data-testid="inspector">ok</span>;
}

describe("QueryProvider — D-09 (global error capture)", () => {
  it("QueryClient has QueryCache with onError that logs with queryKey", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <QueryProvider>
        <Inspector />
      </QueryProvider>
    );

    expect(capturedClient).not.toBeNull();
    const cache = capturedClient!.getQueryCache();
    expect(cache).toBeDefined();

    // Simulate onError callback
    const config = cache.config;
    expect(config.onError).toBeDefined();

    const mockError = new Error("query boom");
    const mockQuery = { queryKey: ["factions"] } as never;
    config.onError!(mockError, mockQuery);

    expect(spy).toHaveBeenCalledWith(
      "[ReactQuery] Query failed:",
      expect.objectContaining({
        queryKey: ["factions"],
        error: "query boom",
        timestamp: expect.any(String),
      })
    );

    spy.mockRestore();
  });

  it("QueryClient has MutationCache with onError that logs with mutationKey", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <QueryProvider>
        <Inspector />
      </QueryProvider>
    );

    expect(capturedClient).not.toBeNull();
    const cache = capturedClient!.getMutationCache();
    expect(cache).toBeDefined();

    const config = cache.config;
    expect(config.onError).toBeDefined();

    const mockError = new Error("mutation boom");
    const mockMutation = {
      options: { mutationKey: ["createFaction"] },
    } as never;
    config.onError!(mockError, undefined, undefined, mockMutation, undefined as never);

    expect(spy).toHaveBeenCalledWith(
      "[ReactQuery] Mutation failed:",
      expect.objectContaining({
        mutationKey: ["createFaction"],
        error: "mutation boom",
        timestamp: expect.any(String),
      })
    );

    spy.mockRestore();
  });
});
