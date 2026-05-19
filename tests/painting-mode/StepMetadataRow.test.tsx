import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepMetadataRow } from "@/features/painting-mode/StepMetadataRow";

describe("StepMetadataRow", () => {
  it("renders all fields when all props are provided", () => {
    render(
      <StepMetadataRow
        technique="Dry Brush"
        tool="Large Brush"
        dilution="Thin"
        timeEstimateMinutes={15}
        paintingPhase="Basecoat"
      />,
    );

    expect(screen.getByText("Dry Brush")).toBeInTheDocument();
    expect(screen.getByText("Large Brush")).toBeInTheDocument();
    expect(screen.getByText("Thin")).toBeInTheDocument();
    expect(screen.getByText("~15m")).toBeInTheDocument();
    expect(screen.getByText("Basecoat")).toBeInTheDocument();
  });

  it("renders technique as Badge with outline variant", () => {
    const { container } = render(
      <StepMetadataRow
        technique="Layering"
        tool={null}
        dilution={null}
        timeEstimateMinutes={null}
        paintingPhase={null}
      />,
    );

    const badge = container.querySelector("[data-slot='badge']");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Layering");
  });

  it("renders paintingPhase as Badge with outline variant", () => {
    const { container } = render(
      <StepMetadataRow
        technique={null}
        tool={null}
        dilution={null}
        timeEstimateMinutes={null}
        paintingPhase="Shading"
      />,
    );

    const badge = container.querySelector("[data-slot='badge']");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Shading");
  });

  it("returns null when all props are null", () => {
    const { container } = render(
      <StepMetadataRow
        technique={null}
        tool={null}
        dilution={null}
        timeEstimateMinutes={null}
        paintingPhase={null}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders only non-null fields (partial props)", () => {
    render(
      <StepMetadataRow
        technique={null}
        tool="Fine Detail Brush"
        dilution={null}
        timeEstimateMinutes={5}
        paintingPhase={null}
      />,
    );

    expect(screen.getByText("Fine Detail Brush")).toBeInTheDocument();
    expect(screen.getByText("~5m")).toBeInTheDocument();
    expect(screen.queryByText("Dry Brush")).not.toBeInTheDocument();
  });

  it("uses text-base class for value text", () => {
    render(
      <StepMetadataRow
        technique={null}
        tool="Medium Brush"
        dilution={null}
        timeEstimateMinutes={null}
        paintingPhase={null}
      />,
    );

    const toolSpan = screen.getByText("Medium Brush").closest("span");
    expect(toolSpan).toHaveClass("text-base");
  });
});
