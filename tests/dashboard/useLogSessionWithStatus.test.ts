import { describe, it } from "vitest";

describe("LogSessionSheet — DATA-02 (cache invalidation after status update)", () => {
  describe("session-only submit (no status change)", () => {
    it.todo("calls createSession.mutateAsync with session data");
    it.todo("does NOT call updateUnit.mutateAsync when new_status is null");
    it.todo("shows success toast 'Session logged.'");
  });

  describe("session + status update submit", () => {
    it.todo("calls createSession.mutateAsync first, then updateUnit.mutateAsync");
    it.todo("passes { id: unit_id, status_painting: new_status } to updateUnit");
    it.todo("shows success toast 'Session logged and status updated.'");
  });

  describe("cache invalidation coverage", () => {
    it.todo("invalidates painting-sessions(unitId) after createSession");
    it.todo("invalidates hobby-analytics after createSession");
    it.todo("invalidates recent-activity after createSession");
    it.todo("invalidates goal-progress after createSession");
    it.todo("invalidates units after updateUnit");
    it.todo("invalidates dashboard-stats after updateUnit");
    it.todo("invalidates spending-stats after updateUnit");
    it.todo("invalidates army-list-readiness after updateUnit");
  });

  describe("partial failure (session ok, status fails)", () => {
    it.todo("shows warning toast when updateUnit rejects after createSession succeeds");
    it.todo("does NOT roll back the session on status update failure");
    it.todo("calls onClose even on partial failure");
  });
});
