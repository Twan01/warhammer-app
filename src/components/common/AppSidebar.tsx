import { Button } from "@/components/ui/button";
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Droplets,
  LayoutDashboard,
  Package,
  Palette,
  Settings as SettingsIcon,
  Shield,
  Sword,
  Swords,
  Wallet,
} from "lucide-react";
import { NavItem } from "./NavItem";
import { useSidebarCollapsed } from "./useSidebarCollapsed";

const MANAGE_NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/factions", label: "Factions", icon: Shield },
  { to: "/collection", label: "Collection", icon: Package },
  { to: "/painting-projects", label: "Painting Projects", icon: Palette },
] as const;

const INVENTORY_NAV = [
  { to: "/paints", label: "Paints", icon: Droplets },
  { to: "/recipes", label: "Recipes", icon: BookOpen },
] as const;

const TRACKING_NAV = [
  { to: "/army-lists", label: "Army Lists", icon: ClipboardList },
  { to: "/battle-log", label: "Battle Log", icon: Swords },
  { to: "/spending", label: "Spending", icon: Wallet },
] as const;

export function AppSidebar() {
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  return (
    <aside
      data-collapsed={collapsed}
      className="flex h-screen flex-col border-r border-border bg-card transition-[width] duration-200 ease-in-out shrink-0"
      style={{ width: collapsed ? 48 : 240 }}
    >
      {/* App wordmark (Phase 16 §Sidebar Polish Contract) */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-border/40">
        <Sword className="h-4 w-4 shrink-0 text-faction-accent" />
        {!collapsed && (
          <span className="text-base font-semibold tracking-tight">HobbyForge</span>
        )}
      </div>

      {/* Main nav (grouped per Phase 16 §Sidebar Polish Contract) */}
      <nav className="flex-1 overflow-y-auto px-2">
        {!collapsed && (
          <p className="px-3 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Manage
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {MANAGE_NAV.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
            />
          ))}
        </ul>

        {!collapsed && (
          <p className="px-3 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Inventory
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {INVENTORY_NAV.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
            />
          ))}
        </ul>

        {!collapsed && (
          <p className="px-3 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Tracking
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {TRACKING_NAV.map((item) => (
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
