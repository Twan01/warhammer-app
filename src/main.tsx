import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryProvider } from "@/components/common/QueryProvider";
import { QuickAddProvider } from "@/context/QuickAddContext";
import { router } from "@/app/router";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryProvider>
      <QuickAddProvider>
        <RouterProvider router={router} />
      </QuickAddProvider>
    </QueryProvider>
  </React.StrictMode>
);
