/**
 * Phase 12 — PaintingRing tests (Plan 12-01 fills in stubs).
 *
 * Pitfall 2 (12-RESEARCH.md): jsdom has no CSS engine, so we test text content and
 * attributes — never computed font-size or fill color via getComputedStyle.
 *
 * Pitfall 6 (12-RESEARCH.md): No matchMedia polyfill needed — PaintingRing has no
 * animation and no media query usage.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaintingRing } from "@/components/common/PaintingRing";

describe("PaintingRing — UI-05 (painting status ring)", () => {
  it("renders the percentage as text content inside the SVG", () => {
    render(<PaintingRing percentage={72} />);
    const svg = screen.getByRole("img");
    const text = svg.querySelector("text");
    expect(text).not.toBeNull();
    expect(text?.textContent).toBe("72%");
  });

  it("exposes role=img and aria-label='{percentage}% painted' for screen readers", () => {
    render(<PaintingRing percentage={42} />);
    const svg = screen.getByRole("img");
    expect(svg.getAttribute("aria-label")).toBe("42% painted");
  });

  it("clamps the dashoffset to 0 when percentage=100 (full ring)", () => {
    render(<PaintingRing percentage={100} />);
    const circles = screen.getByRole("img").querySelectorAll("circle");
    // Two circles: [0] = track (no stroke-dashoffset), [1] = progress arc
    expect(circles).toHaveLength(2);
    const progressArc = circles[1];
    // CIRCUMFERENCE * (1 - 100/100) = 0 — the ring is fully drawn
    expect(progressArc.getAttribute("stroke-dashoffset")).toBe("0");
  });
});
