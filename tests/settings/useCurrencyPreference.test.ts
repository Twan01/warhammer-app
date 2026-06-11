import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/db/queries/appSettings", () => ({
  getAppSettings: vi.fn().mockResolvedValue({}),
  upsertAppSetting: vi.fn().mockResolvedValue(undefined),
}));

import { getAppSettings } from "@/db/queries/appSettings";
import {
  useCurrencyPreference,
  CURRENCY_LOCALE_MAP,
  SUPPORTED_CURRENCIES,
} from "@/hooks/useCurrencyPreference";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, wrapper };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useCurrencyPreference", () => {
  it("returns GBP / en-GB when no currency setting exists", async () => {
    vi.mocked(getAppSettings).mockResolvedValue({});
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useCurrencyPreference(), { wrapper });

    await waitFor(() =>
      expect(result.current).toEqual({ locale: "en-GB", currency: "GBP" }),
    );
  });

  it('returns fr-FR / EUR when currency is "EUR"', async () => {
    vi.mocked(getAppSettings).mockResolvedValue({ currency: "EUR" });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useCurrencyPreference(), { wrapper });

    await waitFor(() =>
      expect(result.current).toEqual({ locale: "fr-FR", currency: "EUR" }),
    );
  });

  it('returns ja-JP / JPY when currency is "JPY"', async () => {
    vi.mocked(getAppSettings).mockResolvedValue({ currency: "JPY" });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useCurrencyPreference(), { wrapper });

    await waitFor(() =>
      expect(result.current).toEqual({ locale: "ja-JP", currency: "JPY" }),
    );
  });

  it("falls back to en-GB locale for unknown currency code", async () => {
    vi.mocked(getAppSettings).mockResolvedValue({ currency: "XYZ" });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useCurrencyPreference(), { wrapper });

    await waitFor(() =>
      expect(result.current).toEqual({ locale: "en-GB", currency: "XYZ" }),
    );
  });
});

describe("CURRENCY_LOCALE_MAP", () => {
  it("has 6 entries covering all supported currencies", () => {
    expect(Object.keys(CURRENCY_LOCALE_MAP)).toHaveLength(6);
    expect(CURRENCY_LOCALE_MAP).toEqual({
      EUR: "fr-FR",
      GBP: "en-GB",
      USD: "en-US",
      CAD: "en-CA",
      AUD: "en-AU",
      JPY: "ja-JP",
    });
  });
});

describe("SUPPORTED_CURRENCIES", () => {
  it("contains 6 currency codes in display order", () => {
    expect(SUPPORTED_CURRENCIES).toEqual([
      "GBP",
      "EUR",
      "USD",
      "CAD",
      "AUD",
      "JPY",
    ]);
  });
});
