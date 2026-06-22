import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaintReadinessBanner } from "@/features/painting-mode/PaintReadinessBanner";

const missingPaints = [
  { id: 1, name: "Abaddon Black", brand: "Citadel" },
  { id: 2, name: "Retributor Armour", brand: "Citadel" },
];

describe("PaintReadinessBanner", () => {
  it("renders missing paint names when array is non-empty", () => {
    render(
      <PaintReadinessBanner missingPaints={missingPaints} onDismiss={() => {}} />,
    );

    expect(screen.getByText(/Citadel Abaddon Black/)).toBeInTheDocument();
    expect(screen.getByText(/Citadel Retributor Armour/)).toBeInTheDocument();
  });

  it("renders the heading text", () => {
    render(
      <PaintReadinessBanner missingPaints={missingPaints} onDismiss={() => {}} />,
    );

    expect(
      screen.getByText(/Some paints are not in your inventory:/),
    ).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button is clicked", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    render(
      <PaintReadinessBanner missingPaints={missingPaints} onDismiss={onDismiss} />,
    );

    const dismissButton = screen.getByRole("button", { name: "Dismiss banner" });
    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("returns null when missingPaints is empty", () => {
    const { container } = render(
      <PaintReadinessBanner missingPaints={[]} onDismiss={() => {}} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders with amber background styling", () => {
    const { container } = render(
      <PaintReadinessBanner missingPaints={missingPaints} onDismiss={() => {}} />,
    );

    const banner = container.firstChild as HTMLElement;
    expect(banner).toHaveClass("bg-amber-500/10");
  });

  // ---------------------------------------------------------------------------
  // unfilledSlotCount prop — INTG-06
  // ---------------------------------------------------------------------------

  it("renders '3 colour slots unfilled' for unfilledSlotCount=3", () => {
    render(
      <PaintReadinessBanner
        missingPaints={[]}
        onDismiss={() => {}}
        unfilledSlotCount={3}
      />,
    );
    expect(screen.getByText("3 colour slots unfilled")).toBeInTheDocument();
  });

  it("renders '1 colour slot unfilled' (singular) for unfilledSlotCount=1", () => {
    render(
      <PaintReadinessBanner
        missingPaints={[]}
        onDismiss={() => {}}
        unfilledSlotCount={1}
      />,
    );
    expect(screen.getByText("1 colour slot unfilled")).toBeInTheDocument();
  });

  it("renders nothing when unfilledSlotCount is 0 and missingPaints is empty", () => {
    const { container } = render(
      <PaintReadinessBanner
        missingPaints={[]}
        onDismiss={() => {}}
        unfilledSlotCount={0}
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/colour slot/)).not.toBeInTheDocument();
  });

  it("renders nothing matching /colour slot/ when unfilledSlotCount is omitted and missingPaints empty", () => {
    const { container } = render(
      <PaintReadinessBanner missingPaints={[]} onDismiss={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/colour slot/)).not.toBeInTheDocument();
  });

  it("renders BOTH missing-paint sentence and unfilled line when both present", () => {
    render(
      <PaintReadinessBanner
        missingPaints={missingPaints}
        onDismiss={() => {}}
        unfilledSlotCount={2}
      />,
    );
    expect(screen.getByText(/Some paints are not in your inventory:/)).toBeInTheDocument();
    expect(screen.getByText("2 colour slots unfilled")).toBeInTheDocument();
  });
});
