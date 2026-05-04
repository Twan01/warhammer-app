/**
 * DASH-08 — Welcome screen shown when stats.hasUnits === false.
 * Full replacement per Phase 16 UI-SPEC §Dashboard welcome screen (Pitfall 3).
 * NOT the standard icon-in-container pattern — the welcome screen has a distinct
 * layout: Sword + HobbyForge wordmark side-by-side, no muted icon pill, larger CTA.
 */
import { Sword } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function DashboardEmptyState() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="flex items-center gap-3">
        <Sword className="h-8 w-8 text-faction-accent" />
        <span className="text-3xl font-semibold tracking-tight">HobbyForge</span>
      </div>
      <div className="space-y-2 max-w-sm">
        <p className="text-base font-semibold">Your collection is empty</p>
        <p className="text-sm text-muted-foreground">
          HobbyForge tracks what you own, what's painted, and what's ready to play.
          Add your first unit to get started.
        </p>
      </div>
      <Button size="lg" onClick={() => navigate({ to: "/collection" })}>
        Add your first unit
      </Button>
    </div>
  );
}
