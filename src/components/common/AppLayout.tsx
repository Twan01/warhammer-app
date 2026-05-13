import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "./AppSidebar";
import { UpdateBanner } from "./UpdateBanner";
import { useQuickAdd } from "@/context/QuickAddContext";
import { UnitSheet } from "@/features/units/UnitSheet";
import { FactionSheet } from "@/features/factions/FactionSheet";
import { PaintSheet } from "@/features/paints/PaintSheet";
import { RecipeFormSheet } from "@/features/recipes/RecipeFormSheet";
import { AddProjectPicker } from "@/features/painting-projects/AddProjectPicker";
import { LogSessionSheet } from "@/features/dashboard/LogSessionSheet";
import { BattleLogSheet } from "@/features/battle-log/BattleLogSheet";

export function AppLayout({ children }: { children: ReactNode }) {
  const { activeSheet, closeQuickAdd } = useQuickAdd();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen bg-background text-foreground">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <UpdateBanner />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
      {/* Global Quick Add Sheet siblings — sibling portal contract (NAV-03) */}
      <UnitSheet
        key="quick-add-unit"
        open={activeSheet === "add-unit"}
        unit={null}
        onClose={closeQuickAdd}
      />
      <FactionSheet
        key="quick-add-faction"
        open={activeSheet === "add-faction"}
        faction={null}
        onClose={closeQuickAdd}
      />
      <PaintSheet
        key="quick-add-paint"
        open={activeSheet === "add-paint"}
        paint={null}
        onClose={closeQuickAdd}
      />
      <RecipeFormSheet
        key="quick-add-recipe"
        open={activeSheet === "add-recipe"}
        recipe={null}
        onClose={closeQuickAdd}
      />
      <AddProjectPicker
        open={activeSheet === "create-project"}
        onOpenChange={(o) => { if (!o) closeQuickAdd(); }}
      />
      <LogSessionSheet
        key="quick-add-session"
        open={activeSheet === "log-session"}
        onClose={closeQuickAdd}
      />
      <BattleLogSheet
        key="quick-add-battle"
        open={activeSheet === "log-battle"}
        log={null}
        onClose={closeQuickAdd}
      />
      {/* Add Purchase maps to UnitSheet in create mode — separate instance for independent form state */}
      <UnitSheet
        key="quick-add-purchase"
        open={activeSheet === "add-purchase"}
        unit={null}
        onClose={closeQuickAdd}
      />
      <Toaster richColors position="bottom-right" />
    </TooltipProvider>
  );
}
