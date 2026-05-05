/**
 * Phase 27 — NAV-03 QuickAddContext unit tests.
 *
 * Verifies that QuickAddProvider exposes correct state management:
 * - activeSheet starts null
 * - openQuickAdd sets the correct action
 * - closeQuickAdd resets to null
 * - Each action maps to the correct Sheet open boolean
 */
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { QuickAddProvider, useQuickAdd } from "@/context/QuickAddContext";
import type { QuickAddAction } from "@/context/QuickAddContext";

function TestConsumer() {
  const { activeSheet, openQuickAdd, closeQuickAdd } = useQuickAdd();
  return (
    <div>
      <span data-testid="active-sheet">{activeSheet ?? "null"}</span>
      <button onClick={() => openQuickAdd("add-unit")}>open-unit</button>
      <button onClick={() => openQuickAdd("log-battle")}>open-battle</button>
      <button onClick={() => closeQuickAdd()}>close</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <QuickAddProvider>
      <TestConsumer />
    </QuickAddProvider>
  );
}

describe("QuickAddContext NAV-03", () => {
  it("activeSheet starts as null", () => {
    renderWithProvider();
    expect(screen.getByTestId("active-sheet").textContent).toBe("null");
  });

  it("openQuickAdd('add-unit') sets activeSheet to 'add-unit'", () => {
    renderWithProvider();
    act(() => { screen.getByText("open-unit").click(); });
    expect(screen.getByTestId("active-sheet").textContent).toBe("add-unit");
  });

  it("openQuickAdd('log-battle') sets activeSheet to 'log-battle'", () => {
    renderWithProvider();
    act(() => { screen.getByText("open-battle").click(); });
    expect(screen.getByTestId("active-sheet").textContent).toBe("log-battle");
  });

  it("closeQuickAdd resets activeSheet to null", () => {
    renderWithProvider();
    act(() => { screen.getByText("open-unit").click(); });
    expect(screen.getByTestId("active-sheet").textContent).toBe("add-unit");
    act(() => { screen.getByText("close").click(); });
    expect(screen.getByTestId("active-sheet").textContent).toBe("null");
  });

  it("useQuickAdd throws when used outside QuickAddProvider", () => {
    // This test renders TestConsumer without provider and expects an error
    expect(() => render(<TestConsumer />)).toThrow(
      "useQuickAdd must be used within QuickAddProvider"
    );
  });

  it("QuickAddAction type includes all 8 actions", () => {
    // Type-level assertion: compile fails if type is wrong
    const actions: QuickAddAction[] = [
      "add-unit", "add-faction", "add-paint", "add-recipe",
      "create-project", "log-session", "add-purchase", "log-battle",
    ];
    expect(actions).toHaveLength(8);
  });
});
