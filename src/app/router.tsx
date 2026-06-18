import { lazy, Suspense } from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
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
const UnitDatabasePageShell = lazy(() => import("./unit-database/page").then(m => ({ default: m.UnitDatabasePageShell })));
const UnitComparePage = lazy(() =>
  import("../features/unit-database/UnitComparePage").then(m => ({ default: m.UnitComparePage }))
);

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

const gameDayIndexRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/game-day",
  component: () => (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <p className="text-base">Select an army list to start Game Day.</p>
      <Link to="/army-lists" className="text-sm underline hover:text-foreground">
        Go to Army Lists
      </Link>
    </div>
  ),
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

export const unitDatabaseRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/unit-database",
  validateSearch: z.object({
    // Deep-link target: open this canonical datasheet on load (WR-01).
    udbUnitId: z.string().optional(),
  }),
  component: UnitDatabasePageShell,
});

// Phase 138-01 PLAY-01 D-01/D-03: Compare page — flat sibling under layoutRoute
// (not a nested child) to avoid Outlet refactor on unitDatabaseRoute. Reads
// compareIds selection from Zustand; no validateSearch needed.
const unitDatabaseCompareRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/unit-database/compare",
  component: UnitComparePage,
});

// ---------------------------------------------------------------------------
// Painting mode route (child of bareLayoutRoute — no sidebar)
// ---------------------------------------------------------------------------

export const paintingModeRoute = createRoute({
  getParentRoute: () => bareLayoutRoute,
  path: "/painting-mode/$assignmentId",
  validateSearch: z.object({ returnTo: z.string().optional() }),
  component: PaintingModePage,
});

// ---------------------------------------------------------------------------
// Route tree
// ---------------------------------------------------------------------------

const routeTree = rootRoute.addChildren([
  layoutRoute.addChildren([
    dashboardRoute,
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
    gameDayIndexRoute,
    gameDayRoute,
    dataHealthRoute,
    unitDatabaseRoute,
    unitDatabaseCompareRoute,
  ]),
  bareLayoutRoute.addChildren([paintingModeRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
