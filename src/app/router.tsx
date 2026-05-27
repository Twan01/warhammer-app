import { lazy, Suspense } from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { z } from "zod";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/common/AppLayout";
import { RouteErrorFallback } from "@/components/common/RouteErrorFallback";
import { ActiveFactionProvider } from "@/context/ActiveFactionContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

// Named-export adapter: .then(m => ({ default: m.PageName })) is required because
// all page components use named exports, not export default.
const DashboardPage = lazy(() => import("./dashboard/page").then(m => ({ default: m.DashboardPage })));
const CollectionPage = lazy(() => import("./collection/page").then(m => ({ default: m.CollectionPage })));
const PaintingProjectsPage = lazy(() => import("./painting-projects/page").then(m => ({ default: m.PaintingProjectsPage })));
const RecipesPage = lazy(() => import("./recipes/page").then(m => ({ default: m.RecipesPage })));
const PaintsPage = lazy(() => import("./paints/page").then(m => ({ default: m.PaintsPage })));
const SettingsPage = lazy(() => import("./settings/page").then(m => ({ default: m.SettingsPage })));
const FactionsPage = lazy(() => import("./factions/page").then(m => ({ default: m.FactionsPage })));
const ArmyListsPage = lazy(() => import("./army-lists/page").then(m => ({ default: m.ArmyListsPage })));
const ArmyListDetailPageShell = lazy(() => import("./army-lists/detail/page").then(m => ({ default: m.ArmyListDetailPageShell })));
const SpendingPage = lazy(() => import("./spending/page").then(m => ({ default: m.SpendingPage })));
const BattleLogPage = lazy(() => import("./battle-log/page").then(m => ({ default: m.BattleLogPage })));
const WishlistPage = lazy(() => import("./wishlist/page").then(m => ({ default: m.WishlistPage })));
const GoalsPage = lazy(() => import("./goals/page").then(m => ({ default: m.GoalsPage })));
const RulesHubPageShell = lazy(() => import("./rules-hub/page").then(m => ({ default: m.RulesHubPageShell })));
const GameDayPageShell = lazy(() => import("./game-day/page").then(m => ({ default: m.GameDayPageShell })));
const DataHealthPage = lazy(() => import("./data-health/page").then(m => ({ default: m.DataHealthPage })));
const PaintingModePage = lazy(() => import("./painting-mode/page").then(m => ({ default: m.PaintingModePage })));

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
        <Suspense fallback={<div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
          <Outlet />
        </Suspense>
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
        <Suspense fallback={<div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
          <Outlet />
        </Suspense>
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

const armyListDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/army-lists/$listId",
  component: ArmyListDetailPageShell,
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
    armyListDetailRoute,
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
