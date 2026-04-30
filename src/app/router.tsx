import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { AppLayout } from "@/components/common/AppLayout";
import { DashboardPage } from "./dashboard/page";
import { CollectionPage } from "./collection/page";
import { PaintingProjectsPage } from "./painting-projects/page";
import { RecipesPage } from "./recipes/page";
import { PaintsPage } from "./paints/page";
import { SettingsPage } from "./settings/page";

const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </AppLayout>
  ),
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
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

const recipesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recipes",
  component: RecipesPage,
});

const paintsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/paints",
  component: PaintsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  collectionRoute,
  paintingProjectsRoute,
  recipesRoute,
  paintsRoute,
  settingsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
