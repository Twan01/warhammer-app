import { useCallback } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";

/**
 * useStartPainting — centralized navigation into Painting Mode (IN-02).
 *
 * Returns a stable callback that navigates to
 * `/painting-mode/$assignmentId` while capturing where to return to on exit.
 *
 * The `returnTo` value uses `location.href` (the router-relative href,
 * including any search/query string) rather than `location.pathname`, so a
 * filtered page (e.g. `/recipes?paintId=3`) is restored on exit instead of
 * losing its state (WR-02).
 *
 * Callers that already know a fixed return target (e.g. the dashboard) may pass
 * an explicit `returnTo` override.
 */
export function useStartPainting() {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (assignmentId: number, returnToOverride?: string) => {
      const returnTo = returnToOverride ?? location.href;
      navigate({
        to: "/painting-mode/$assignmentId",
        params: { assignmentId: String(assignmentId) },
        search: { returnTo },
      });
    },
    [navigate, location.href],
  );
}
