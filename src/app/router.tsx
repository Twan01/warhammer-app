import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { z } from "zod";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { AppLayout } from "@/components/common/AppLayout";
import { ActiveFactionProvider } from "@/context/ActiveFactionContext";
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

const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <ActiveFactionProvider>
        <Outlet />
      </ActiveFactionProvider>
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </AppLayout>
  ),
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const factionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/factions",
  component: FactionsPage,
});

const collectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/collection",
  component: CollectionPage,
});

const paintingProjectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/painting-projects",
  component: PaintingProjectsPage,
});

export const recipesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recipes",
  validateSearch: z.object({
    paintId: z.number().optional(),
  }),
  component: RecipesPage,
});

const paintsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/paints",
  component: PaintsPage,
});

const armyListsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/army-lists",
  component: ArmyListsPage,
});

const spendingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/spending",
  component: SpendingPage,
});

const wishlistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wishlist",
  component: WishlistPage,
});

const battleLogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/battle-log",
  component: BattleLogPage,
});

const goalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/goals",
  component: GoalsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const rulesHubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rules-hub",
  component: RulesHubPageShell,
});

const routeTree = rootRoute.addChildren([
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
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
