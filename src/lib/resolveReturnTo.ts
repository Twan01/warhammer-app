/**
 * resolveReturnTo — validate a `returnTo` navigation target (WR-03).
 *
 * The painting-mode exit flow receives an arbitrary `returnTo` string from a
 * search param. This guard is the real backstop for that navigation:
 *
 *   1. Rejects open-redirect values — anything not starting with a single "/"
 *      (e.g. "//evil.com", "http://evil.com", "javascript:…").
 *   2. Degrades unmatched / stale internal paths to "/" so a path to a
 *      since-deleted resource ("/army-lists/999") or an unknown route never
 *      surfaces the router's not-found / error route on exit.
 *
 * Validation is by first path segment against the known top-level route set.
 * Dynamic child routes (e.g. "/army-lists/$listId") are allowed because their
 * parent segment is known; if the concrete id no longer matches a resource the
 * destination page renders its own empty/not-found state rather than the global
 * router error boundary, which is the desired graceful degradation.
 *
 * The query string (and hash) on a valid path is preserved so page state
 * (e.g. "/recipes?paintId=3") survives the round-trip (WR-02).
 */

/**
 * First path segment of every known top-level route, derived from the route
 * tree in `src/app/router.tsx`. Keep in sync when routes are added/removed.
 */
const KNOWN_ROUTE_SEGMENTS = new Set<string>([
  "factions",
  "collection",
  "painting-projects",
  "goals",
  "recipes",
  "paints",
  "army-lists",
  "spending",
  "wishlist",
  "battle-log",
  "settings",
  "rules-hub",
  "game-day",
  "data-health",
  "unit-database",
]);

export function resolveReturnTo(returnTo: string | undefined | null): string {
  // Open-redirect guard: must be a single-slash-prefixed relative path.
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }

  // Strip query/hash to inspect the pathname only.
  const pathname = returnTo.split(/[?#]/, 1)[0];

  // Root path is always valid.
  if (pathname === "/") {
    return returnTo;
  }

  // Reject backslash-escaped or otherwise malformed paths.
  if (pathname.includes("\\")) {
    return "/";
  }

  const firstSegment = pathname.split("/")[1] ?? "";
  if (KNOWN_ROUTE_SEGMENTS.has(firstSegment)) {
    return returnTo;
  }

  return "/";
}
