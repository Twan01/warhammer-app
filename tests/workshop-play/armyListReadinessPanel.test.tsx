/** Wave 0 stubs for PLAY-01 — ArmyListSummaryBar readiness panel upgrade. Plan 29-03 fills these. */
import { describe, it } from "vitest";

describe.skip("ArmyListSummaryBar readiness panel (PLAY-01)", () => {
  it.skip("renders a progress bar with width matching battleReadyPct");
  // TODO Plan 29-03: render with 2 units (1 Completed, 1 not),
  // assert progress bar div style.width = "50%"

  it.skip("progress bar uses bg-battle-gold class for the filled portion");
  // TODO Plan 29-03: assert inner progress div has class "bg-battle-gold"

  it.skip("renders not-ready unit list with StatusBadge per non-Completed unit");
  // TODO Plan 29-03: render with 2 units where 1 is "Primed",
  // assert unit_name and StatusBadge visible

  it.skip("hides not-ready list when all units are Completed");
  // TODO Plan 29-03: render with all Completed units,
  // assert "All units battle-ready" text visible

  it.skip("shows gold-tinted 'All units battle-ready' message at 100%");
  // TODO Plan 29-03: assert element with "All units battle-ready" text
  // has class "text-battle-gold"

  it.skip("still renders existing stat row (Total, Painted, Battle-ready)");
  // TODO Plan 29-03: render with units,
  // assert "Total" and "Painted" and "Battle-ready" labels present
});
