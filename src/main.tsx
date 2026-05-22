import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryProvider } from "@/components/common/QueryProvider";
import { DbHealthGate } from "@/components/common/DbHealthGate";
import { QuickAddProvider } from "@/context/QuickAddContext";
import { router } from "@/app/router";
import {
  handleGlobalError,
  handleUnhandledRejection,
} from "@/lib/globalErrorHandlers";
import "./styles/globals.css";

/* ── Global error handlers (D-08) ─────────────────────────────── */

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
