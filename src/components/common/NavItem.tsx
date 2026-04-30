import { Link, useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
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
    <SidebarMenuButton asChild isActive={isActive}>
      <Link to={to} className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className={collapsed ? "sr-only" : ""}>{label}</span>
      </Link>
    </SidebarMenuButton>
  );

  return (
    <SidebarMenuItem>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
    </SidebarMenuItem>
  );
}
