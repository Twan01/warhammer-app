/**
 * Phase 25 (DSFD-02) — Shared page header used by all 9 main pages.
 *
 * Extracts the inline header pattern that has been duplicated across
 * DashboardPage (×3 branches), CollectionPage, PaintingProjectsPage,
 * PaintsPage, RecipesPage, ArmyListsPage, BattleLogPage, SpendingPage,
 * and FactionsPage.
 *
 * Outer container className is locked — it is consumed unchanged by every
 * existing page. Do not change without revisiting Plan 25-02.
 */
import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-6 border-b border-border/40">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
