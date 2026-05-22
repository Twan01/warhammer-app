import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { z } from "zod";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { AppLayout } from "@/components/common/AppLayout";
import { RouteErrorFallback } from "@/components/common/RouteErrorFallback";
import { ActiveFactionProvider } from "@/context/ActiveFactionContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { DashboardPage } from "./dashboard/page";
import { CollectionPage } from "./collection/page";
import { PaintingProjectsPage } from "./painting-projects/page";
import { RecipesPage } from "./recipes/page";
import { PaintsPage } from "./paints/page";
import { SettingsPage } from "./settings/page";
import { FactionsPage } from "./factions/page";
import { ArmyListsPage } from "./army-lists/page";
import { SpendingPage } from "./spending/page";
import { BattleLogPage } from "./battle-log/page";
import { WishlistPage } from "./wishlist/page";
import { GoalsPage } from "./goals/page";
import { RulesHubPageShell } from "./rules-hub/page";
import { GameDayPageShell } from "./game-day/page";
import { DataHealthPage } from "./data-health/page";
import { PaintingModePage } from "./painting-mode/page";

// ---------------------------------------------------------------------------
// Root route — thin shell: only renders Outlet + devtools
// ---------------------------------------------------------------------------

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </>
  ),
});

// ---------------------------------------------------------------------------
// Layout route — standard app shell with sidebar
// ---------------------------------------------------------------------------

export const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "layout",
  errorComponent: RouteErrorFallback,
  component: () => (
    <AppLayout>
      <ActiveFactionProvider>
        <Outlet />
      </ActiveFactionProvider>
    </AppLayout>
  ),
});

// ---------------------------------------------------------------------------
// Bare layout route — distraction-free, no sidebar (painting mode)
// ---------------------------------------------------------------------------

export const bareLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "bare-layout",
  errorComponent: RouteErrorFallback,
  component: () => (
    <ActiveFactionProvider>
      <TooltipProvider delayDuration={200}>
        <Outlet />
        <Toaster richColors position="bottom-right" />
      </TooltipProvider>
    </ActiveFactionProvider>
  ),
});

// ---------------------------------------------------------------------------
// Standard page routes (children of layoutRoute)
// ---------------------------------------------------------------------------

const dashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/",
  component: DashboardPage,
});

const factionsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/factions",
  component: FactionsPage,
});

const collectionRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/collection",
  component: CollectionPage,
});

const paintingProjectsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/painting-projects",
  component: PaintingProjectsPage,
});

export const recipesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/recipes",
  validateSearch: z.object({
    paintId: z.number().optional(),
  }),
  component: RecipesPage,
});

const paintsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/paints",
  component: PaintsPage,
});

const armyListsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/army-lists",
  component: ArmyListsPage,
});

const spendingRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/spending",
  component: SpendingPage,
});

const wishlistRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/wishlist",
  component: WishlistPage,
});

const battleLogRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/battle-log",
  component: BattleLogPage,
});

const goalsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/goals",
  component: GoalsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/settings",
  component: SettingsPage,
});

const rulesHubRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/rules-hub",
  component: RulesHubPageShell,
});

const gameDayRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/game-day/$listId",
  component: GameDayPageShell,
});

const dataHealthRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/data-health",
  component: DataHealthPage,
});

// ---------------------------------------------------------------------------
// Painting mode route (child of bareLayoutRoute — no sidebar)
// ---------------------------------------------------------------------------

const paintingModeRoute = createRoute({
  getParentRoute: () => bareLayoutRoute,
  path: "/painting-mode/$assignmentId",
  component: PaintingModePage,
});

// ---------------------------------------------------------------------------
// Route tree
// ---------------------------------------------------------------------------

const routeTree = rootRoute.addChildren([
  layoutRoute.addChildren([
    dashboardRoute,
    factionsRoute,
    collectionRoute,
    paintingProjectsRoute,
    goalsRoute,
    recipesRoute,
    paintsRoute,
    armyListsRoute,
    spendingRoute,
    wishlistRoute,
    battleLogRoute,
    settingsRoute,
    rulesHubRoute,
    gameDayRoute,
    dataHealthRoute,
  ]),
  bareLayoutRoute.addChildren([paintingModeRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
