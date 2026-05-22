import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryProvider } from "@/components/common/QueryProvider";
import { DbHealthGate } from "@/components/common/DbHealthGate";
import { QuickAddProvider } from "@/context/QuickAddContext";
import { router } from "@/app/router";
import "./styles/globals.css";

/* ── Global error handlers (D-08) ─────────────────────────────── */

export function handleGlobalError(
  message: string | Event,
  source?: string,
  lineno?: number,
  colno?: number,
  error?: Error
): void {
  console.error("[GlobalError]", {
    timestamp: new Date().toISOString(),
    type: "uncaught",
    message: String(message),
    source,
    location: `${lineno ?? 0}:${colno ?? 0}`,
    stack: error?.stack,
  });
}

export function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  console.error("[UnhandledRejection]", {
    timestamp: new Date().toISOString(),
    type: "unhandledRejection",
    reason:
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason),
    stack: event.reason instanceof Error ? event.reason.stack : undefined,
  });
}

window.onerror = handleGlobalError;
window.onunhandledrejection = handleUnhandledRejection;

/* ── App bootstrap ─────────────────────────────────────────────── */

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DbHealthGate>
      <QueryProvider>
        <QuickAddProvider>
          <RouterProvider router={router} />
        </QuickAddProvider>
      </QueryProvider>
    </DbHealthGate>
  </React.StrictMode>
);
