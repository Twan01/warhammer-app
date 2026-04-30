import { Button } from "@/components/ui/button";
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  Droplets,
  LayoutDashboard,
  Package,
  Palette,
  Settings as SettingsIcon,
  Swords,
} from "lucide-react";
import { NavItem } from "./NavItem";
import { useSidebarCollapsed } from "./useSidebarCollapsed";

const MAIN_NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/collection", label: "Collection", icon: Package },
  { to: "/painting-projects", label: "Painting Projects", icon: Palette },
  { to: "/recipes", label: "Recipes", icon: BookOpen },
  { to: "/paints", label: "Paints", icon: Droplets },
] as const;

export function AppSidebar() {
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  return (
    <aside
      data-collapsed={collapsed}
      className="flex h-screen flex-col border-r border-border bg-card transition-[width] duration-200 ease-in-out shrink-0"
      style={{ width: collapsed ? 48 : 240 }}
    >
      {/* Logo / app name (UI-SPEC §4) */}
      <div className="flex items-center gap-2 p-4">
        <Swords className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="text-sm font-semibold">HobbyForge</span>}
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-2">
        <ul className="flex flex-col gap-1">
          {MAIN_NAV.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
            />
          ))}
        </ul>
      </nav>

      {/* Collapse toggle (above Settings, per UI-SPEC §4) */}
      <div className="px-2 pb-1">
        <Button
          variant="ghost"
          size="icon"
          className={collapsed ? "mx-auto" : "w-full"}
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Settings (pinned bottom) */}
      <div className="border-t border-border px-2 py-2">
        <ul>
          <NavItem
            to="/settings"
            label="Settings"
            icon={SettingsIcon}
            collapsed={collapsed}
          />
        </ul>
      </div>
    </aside>
  );
}
