import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

/**
 * Desktop-tuned QueryClient defaults (SETUP-05 / ARCHITECTURE Anti-Pattern 3):
 * - staleTime 5min: avoids re-querying SQLite on every navigation
 * - gcTime 10min: keeps recent queries cached after unmount
 * - refetchOnWindowFocus false: there's no remote server to sync with
 * - retry 1: SQLite errors are usually deterministic; single retry is enough
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 10,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
