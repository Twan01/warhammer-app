/**
 * NAV-06 — BattleLogRow army-list name is a Link with stopPropagation.
 *
 * Behaviors:
 *   (a) with armyListName + army_list_id → renders an anchor link to /army-lists/$listId
 *   (b) clicking the link calls stopPropagation (does NOT toggle row expansion)
 *   (c) without army_list_id → no link, plain text shown instead
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BattleLog } from "@/types/battleLog";

// Link renders as <a href=...> so we can assert on the href
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, onClick, ...rest }: any) => {
    // Construct the resolved href from to + params (mimic TanStack Router behaviour)
    let href = to as string;
    if (params) {
      Object.entries(params as Record<string, string>).forEach(([k, v]) => {
        href = href.replace(`$${k}`, v);
      });
    }
    return (
      <a href={href} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  },
}));

import { BattleLogRow } from "@/features/battle-log/BattleLogRow";

function makeLog(over: Partial<BattleLog> = {}): BattleLog {
  return {
    id: 1,
    army_list_id: 42,
    battle_date: "2026-06-01",
    opponent: "Alice",
    opponent_faction: "Necrons",
    mission: "Scorched Earth",
    points_played: 2000,
    result: "Win",
    my_score: 80,
    opponent_score: 60,
    mvp_unit_id: null,
    underperforming_unit_id: null,
    lessons_learned: null,
    changes_next_time: null,
    notes: null,
    forgotten_rules: null,
    mvp_notes: null,
    underperformer_notes: null,
    created_at: "2026-06-01T12:00:00",
    ...over,
  };
}

function renderRow(props: Partial<Parameters<typeof BattleLogRow>[0]> = {}) {
  return render(
    <BattleLogRow
      log={makeLog()}
      armyListName="Ultramarines Strike Force"
      armyListReadiness={null}
      mvpUnitName={null}
      underperformingUnitName={null}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      {...props}
    />,
  );
}

describe("NAV-06 — BattleLogRow army-list link", () => {
  it("(a) renders a link to the army list when armyListName and army_list_id are set", () => {
    renderRow({ log: makeLog({ army_list_id: 42 }), armyListName: "Ultramarines Strike Force" });
    const link = screen.getByRole("link", { name: "Ultramarines Strike Force" });
    expect(link).toBeInTheDocument();
    // TanStack Link resolves /army-lists/$listId → /army-lists/42
    expect(link).toHaveAttribute("href", "/army-lists/42");
  });

  it("(b) clicking the link calls stopPropagation — preventing row toggle", () => {
    renderRow({
      log: makeLog({ army_list_id: 42 }),
      armyListName: "Ultramarines Strike Force",
    });
    const link = screen.getByRole("link", { name: "Ultramarines Strike Force" });

    // Dispatch a click on the link and verify React's onClick calls stopPropagation.
    // We spy on the nativeEvent.stopPropagation by wrapping the event that reaches
    // React's synthetic event handler via fireEvent (which uses React's reconciler).
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    const stopPropSpy = vi.spyOn(clickEvent, "stopPropagation");
    link.dispatchEvent(clickEvent);

    // The link's onClick handler (e.stopPropagation()) must have been invoked
    expect(stopPropSpy).toHaveBeenCalled();
  });

  it("(c) without army_list_id — no link, shows plain italic text", () => {
    renderRow({ log: makeLog({ army_list_id: null }), armyListName: null });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    // With army_list_id null and armyListName null → "No army list" text
    expect(screen.getByText(/no army list/i)).toBeInTheDocument();
  });

  it("(c) with army_list_id set but armyListName null → shows deleted italic text, no link", () => {
    // armyListName null + army_list_id non-null → list was deleted
    renderRow({ log: makeLog({ army_list_id: 99 }), armyListName: null });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/army list deleted/i)).toBeInTheDocument();
  });
});
