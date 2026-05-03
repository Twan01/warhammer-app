import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavItem } from "@/components/common/NavItem";
import { LayoutDashboard } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/" }),
  Link: ({ children, className, to }: { children: React.ReactNode; className?: string; to: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

function renderNavItem(collapsed: boolean, to = "/") {
  return render(
    <TooltipProvider>
      <ul>
        <NavItem to={to} label="Dashboard" icon={LayoutDashboard} collapsed={collapsed} />
      </ul>
    </TooltipProvider>
  );
}

describe("NavItem", () => {
  describe("when expanded (collapsed=false)", () => {
    it("renders label text visibly", () => {
      renderNavItem(false);
      const span = screen.getByText("Dashboard");
      expect(span.className).not.toContain("sr-only");
    });

    it("applies bg-faction-accent class on active route", () => {
      const { container } = renderNavItem(false, "/");
      const link = container.querySelector("a");
      expect(link?.className).toContain("bg-faction-accent");
    });
  });

  describe("when collapsed (collapsed=true)", () => {
    it("renders label as sr-only", () => {
      renderNavItem(true);
      const span = screen.getByText("Dashboard");
      expect(span.className).toContain("sr-only");
    });
  });
});
