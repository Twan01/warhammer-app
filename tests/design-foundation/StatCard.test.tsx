/**
 * Phase 25 (DSFD-03) — StatCard optional props and backward compat tests.
 * Phase 30 (LAYOUT-02) — StatCard navigation `to` prop tests.
 *
 * useCountUp uses requestAnimationFrame which is not available in jsdom.
 * We mock the hook so StatCard renders synchronously in tests without
 * needing rAF polyfills. The hook's own behavior is tested separately in
 * tests/dashboard/useCountUp.test.ts.
 *
 * matchMedia is also polyfilled because useCountUp reads it for reduced-motion
 * even inside the mock (the mock replaces the hook module entirely, so the
 * polyfill is a belt-and-suspenders guard for any direct window usage).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatCard } from "@/features/dashboard/StatCard";

// Mock useCountUp — returns the target value immediately so AnimatedNumber
// renders the final value in the same synchronous render pass.
vi.mock("@/hooks/useCountUp", () => ({
  useCountUp: (target: number) => target,
}));

// Phase 30 — StatCard now imports useNavigate; mock it so tests don't need a RouterProvider.
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  mockNavigate.mockClear();
});

// matchMedia polyfill (jsdom omits it; useCountUp reads it before the mock
// can intercept if the module is already initialized).
Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: vi.fn().mockReturnValue({
    matches: false,
    media: "",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList),
});

describe("DSFD-03 — StatCard backward compatibility", () => {
  it("renders value and label with only required props (no extras)", () => {
    render(<StatCard value={42} label="Total Units" />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Total Units")).toBeInTheDocument();
  });

  it("renders string value unchanged", () => {
    render(<StatCard value="72%" label="Painted" />);
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("Painted")).toBeInTheDocument();
  });

  it("renders animated number value when animate=true (via mocked useCountUp)", () => {
    render(<StatCard value={10} label="Factions" animate />);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Factions")).toBeInTheDocument();
  });
});

describe("DSFD-03 — StatCard optional icon prop", () => {
  it("renders an icon element above the value when icon prop is provided", () => {
    // Use a minimal stub icon — matches Lucide component shape
    function TestIcon({ size, className }: { size?: number; className?: string }) {
      return <svg data-testid="stat-icon" width={size} className={className} />;
    }
    render(<StatCard value={5} label="Factions" icon={TestIcon} />);
    expect(screen.getByTestId("stat-icon")).toBeInTheDocument();
  });

  it("does not render any icon element when icon prop is absent", () => {
    render(<StatCard value={5} label="Factions" />);
    expect(document.querySelector("svg")).toBeNull();
  });
});

describe("DSFD-03 — StatCard optional trend prop", () => {
  it("renders trend.label text when trend prop is provided", () => {
    render(
      <StatCard
        value={12}
        label="Games"
        trend={{ value: 3, label: "+3 this month" }}
      />,
    );
    expect(screen.getByText("+3 this month")).toBeInTheDocument();
  });

  it("does not render trend text when trend prop is absent", () => {
    render(<StatCard value={12} label="Games" />);
    expect(screen.queryByText(/this month/i)).toBeNull();
  });
});

describe("DSFD-03 — StatCard optional progress prop", () => {
  it("renders a progress bar div when progress prop is provided", () => {
    const { container } = render(<StatCard value={30} label="Painted" progress={42} />);
    // The outer progress track div
    const track = container.querySelector(".bg-border\\/40");
    expect(track).not.toBeNull();
  });

  it("sets the fill width to the given percentage", () => {
    const { container } = render(<StatCard value={30} label="Painted" progress={42} />);
    const fill = container.querySelector(".bg-faction-accent");
    expect(fill).not.toBeNull();
    expect((fill as HTMLElement).style.width).toBe("42%");
  });

  it("renders a 0%-wide bar when progress={0} (progress !== undefined guard)", () => {
    const { container } = render(<StatCard value={0} label="Painted" progress={0} />);
    const fill = container.querySelector(".bg-faction-accent");
    expect(fill).not.toBeNull();
    expect((fill as HTMLElement).style.width).toBe("0%");
  });

  it("does not render a progress bar when progress prop is absent", () => {
    const { container } = render(<StatCard value={30} label="Painted" />);
    expect(container.querySelector(".bg-faction-accent")).toBeNull();
  });
});

describe("Phase 30 — StatCard navigation (to prop)", () => {
  it("renders role='button' and tabIndex=0 when to prop is provided", () => {
    render(<StatCard value={42} label="Total Models" to="/collection" />);
    const card = screen.getByRole("button");
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute("tabindex", "0");
  });

  it("does NOT render role='button' when to prop is absent", () => {
    render(<StatCard value={42} label="Total Models" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("has cursor-pointer class when to prop is provided", () => {
    render(<StatCard value={42} label="Total Models" to="/collection" />);
    const card = screen.getByRole("button");
    expect(card.className).toContain("cursor-pointer");
  });

  it("does NOT have cursor-pointer class when to prop is absent", () => {
    const { container } = render(<StatCard value={42} label="Total Models" />);
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).not.toContain("cursor-pointer");
  });

  it("calls navigate with to value on click", async () => {
    const user = userEvent.setup();
    render(<StatCard value={42} label="Total Models" to="/collection" />);
    await user.click(screen.getByRole("button"));
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/collection" });
  });

  it("calls navigate on Enter key press (keyboard accessibility)", async () => {
    const user = userEvent.setup();
    render(<StatCard value={42} label="Total Models" to="/collection" />);
    const card = screen.getByRole("button");
    card.focus();
    await user.keyboard("{Enter}");
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/collection" });
  });

  it("calls navigate on Space key press (keyboard accessibility)", async () => {
    const user = userEvent.setup();
    render(<StatCard value={42} label="Total Models" to="/collection" />);
    const card = screen.getByRole("button");
    card.focus();
    await user.keyboard(" ");
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/collection" });
  });
});
