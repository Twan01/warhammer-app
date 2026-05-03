import { Link, useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
}

export function NavItem({ to, label, icon: Icon, collapsed }: NavItemProps) {
  const location = useLocation();
  const isActive =
    to === "/"
      ? location.pathname === "/"
      : location.pathname === to || location.pathname.startsWith(to + "/");

  const button = (
    <Link
      to={to}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
        isActive
          ? "bg-faction-accent font-medium text-white"
          : "text-muted-foreground"
      } ${collapsed ? "justify-center" : ""}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className={collapsed ? "sr-only" : ""}>{label}</span>
    </Link>
  );

  return (
    <li>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
    </li>
  );
}
