/**
 * FBK-03: SpendingPage error paragraph uses text-destructive class.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/hooks/useSpendingStats", () => ({
  useSpendingStats: () => ({
    data: undefined,
    isLoading: false,
    isError: true,
  }),
}));

vi.mock("@/hooks/useHobbyAnalytics", () => ({
  useHobbyAnalytics: () => ({
    data: undefined,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useCurrencyPreference", () => ({
  useCurrencyPreference: () => ({
    locale: "en-GB",
    currency: "GBP",
  }),
}));

vi.mock("@/components/common/PageHeader", () => ({
  PageHeader: () => null,
}));

import { SpendingPage } from "@/features/spending/SpendingPage";

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("FBK-03: Spending error styling", () => {
  it("error paragraph has text-destructive class", () => {
    render(<SpendingPage />, { wrapper: Wrapper });

    const errorText = screen.getByText(/could not load spending data/i);
    expect(errorText).toBeInTheDocument();
    expect(errorText).toHaveClass("text-destructive");
  });

  it("error paragraph does NOT have text-muted-foreground", () => {
    render(<SpendingPage />, { wrapper: Wrapper });

    const errorText = screen.getByText(/could not load spending data/i);
    expect(errorText).not.toHaveClass("text-muted-foreground");
  });
});
