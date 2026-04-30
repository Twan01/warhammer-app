import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "./AppSidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen bg-background text-foreground">
        <AppSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </TooltipProvider>
  );
}
