import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/db/queries/appSettings", () => ({
  getAppSettings: vi.fn().mockResolvedValue({}),
  upsertAppSetting: vi.fn().mockResolvedValue(undefined),
}));

import {
  APP_SETTINGS_KEY,
  useAppSettings,
  useUpdateSetting,
} from "@/hooks/useAppSettings";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAppSettings — APP_SETTINGS_KEY constant", () => {
  it("APP_SETTINGS_KEY equals ['app-settings']", () => {
    expect(APP_SETTINGS_KEY).toEqual(["app-settings"]);
  });
});

describe("useAppSettings — useAppSettings hook", () => {
  it("returns data from getAppSettings", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAppSettings(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({});
  });
});

describe("useAppSettings — useUpdateSetting invalidation", () => {
  it("invalidates APP_SETTINGS_KEY on successful mutation", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateSetting(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ key: "test", value: "val" });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(APP_SETTINGS_KEY);
  });
});
