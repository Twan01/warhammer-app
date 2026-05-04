/**
 * Phase 25 (DSFD-02) — PageHeader component behavioral tests.
 *
 * Tests verify the rendering contract described in 25-01-PLAN.md:
 * - title renders as h1
 * - subtitle renders when provided, omitted when not
 * - actions render in the right slot when provided, omitted when not
 * - outer container has the locked className
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/common/PageHeader";

describe("DSFD-02 — PageHeader component", () => {
  it("renders the title as an h1 element", () => {
    render(<PageHeader title="My Collection" />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("My Collection");
  });

  it("renders subtitle text when the subtitle prop is provided", () => {
    render(<PageHeader title="Collection" subtitle="All units you own" />);
    expect(screen.getByText("All units you own")).toBeInTheDocument();
  });

  it("does not render a subtitle element when subtitle is omitted", () => {
    render(<PageHeader title="Factions" />);
    // The only text content should be the title itself
    const paragraphs = document.querySelectorAll("p");
    expect(paragraphs).toHaveLength(0);
  });

  it("renders actions in the right slot when actions prop is provided", () => {
    render(
      <PageHeader
        title="Paints"
        actions={<button type="button">Add Paint</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Add Paint" })).toBeInTheDocument();
  });

  it("does not render the actions wrapper div when actions is omitted", () => {
    const { container } = render(<PageHeader title="Dashboard" />);
    // The outer container div + the inner left div = 2 divs when no actions
    const divs = container.querySelectorAll("div");
    expect(divs).toHaveLength(2);
  });

  it("outer container has the locked className", () => {
    const { container } = render(<PageHeader title="Test" />);
    const outer = container.firstElementChild;
    expect(outer).toHaveClass("flex", "items-center", "justify-between", "pb-6", "border-b");
  });

  it("renders without errors when neither subtitle nor actions are provided", () => {
    expect(() => render(<PageHeader title="Battle Log" />)).not.toThrow();
  });

  it("renders multiple action elements via a fragment", () => {
    render(
      <PageHeader
        title="Collection"
        actions={
          <>
            <button type="button">Table</button>
            <button type="button">Gallery</button>
            <button type="button">Add Unit</button>
          </>
        }
      />,
    );
    expect(screen.getByRole("button", { name: "Table" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gallery" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Unit" })).toBeInTheDocument();
  });
});
