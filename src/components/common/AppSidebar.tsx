import { Button } from "@/components/ui/button";
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Droplets,
  Heart,
  LayoutDashboard,
  Package,
  Paintbrush,
  Palette,
  Plus,
  Settings as SettingsIcon,
  Shield,
  Sword,
  Swords,
  Wallet,
} from "lucide-react";
import { NavItem } from "./NavItem";
import { useSidebarCollapsed } from "./useSidebarCollapsed";
import { useQuickAdd } from "@/context/QuickAddContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const COMMAND_NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/collection", label: "Collection", icon: Package },
  { to: "/painting-projects", label: "Painting Projects", icon: Palette },
] as const;

const WORKSHOP_NAV = [
  { to: "/paints", label: "Paints", icon: Droplets },
  { to: "/recipes", label: "Recipes", icon: BookOpen },
] as const;

const PLAY_NAV = [
  { to: "/army-lists", label: "Army Lists", icon: ClipboardList },
  { to: "/battle-log", label: "Battle Log", icon: Swords },
] as const;

const MANAGEMENT_NAV = [
  { to: "/factions", label: "Factions", icon: Shield },
  { to: "/spending", label: "Spending", icon: Wallet },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
] as const;

export function AppSidebar() {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const { openQuickAdd } = useQuickAdd();

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

      {/* Quick Add button (NAV-02) — between wordmark and first nav group */}
      <div className="px-2 py-2 border-b border-border/40">
        <DropdownMenu>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="mx-auto flex"
                    aria-label="Quick Add"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">Quick Add</TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-dashed justify-start gap-2"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Quick Add
              </Button>
            </DropdownMenuTrigger>
          )}
          <DropdownMenuContent side="right" align="start" sideOffset={8}>
            <DropdownMenuItem onClick={() => openQuickAdd("add-unit")}>
              <Package className="mr-2 h-4 w-4" />
              Add Unit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openQuickAdd("add-faction")}>
              <Shield className="mr-2 h-4 w-4" />
              Add Faction
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openQuickAdd("add-paint")}>
              <Droplets className="mr-2 h-4 w-4" />
              Add Paint
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openQuickAdd("add-recipe")}>
              <BookOpen className="mr-2 h-4 w-4" />
              Add Recipe
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openQuickAdd("create-project")}>
              <Palette className="mr-2 h-4 w-4" />
              Create Project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openQuickAdd("log-session")}>
              <Paintbrush className="mr-2 h-4 w-4" />
              Log Session
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openQuickAdd("add-purchase")}>
              <Wallet className="mr-2 h-4 w-4" />
              Add Purchase
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openQuickAdd("log-battle")}>
              <Swords className="mr-2 h-4 w-4" />
              Log Battle
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main nav (grouped per Phase 16 §Sidebar Polish Contract) */}
      <nav className="flex-1 overflow-y-auto px-2">
        {!collapsed && (
          <p className="px-3 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Command
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {COMMAND_NAV.map((item) => (
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
            Workshop
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {WORKSHOP_NAV.map((item) => (
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
            Play
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {PLAY_NAV.map((item) => (
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
            Management
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {MANAGEMENT_NAV.map((item) => (
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
