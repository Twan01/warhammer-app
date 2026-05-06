/**
 * Shared stat card used 7x by DashboardPage:
 * - Top stat row: 4 cards (DASH-01) — Phase 11 passes animate={true} for UI-07
 * - Progress section: 3 cards (DASH-03, DASH-04) — animate stays absent (default false)
 *
 * Layout per 05-UI-SPEC.md:
 * - Card with px-6 py-6 (Card default already has py-6; we override CardContent px to 0 so
 *   the outer Card px-6 is the single source)
 * - text-3xl font-semibold for the number (28px stat display)
 * - text-sm text-muted-foreground for the label
 * - No CardHeader / CardTitle / CardDescription (minimal variant)
 *
 * Phase 11 (UI-07): When `animate={true}` and `value` is a number, the number animates from 0
 * to `value` over 600ms via the useCountUp hook. AnimatedNumber is a separate sub-component
 * to satisfy React Rules of Hooks — useCountUp is always called when AnimatedNumber renders;
 * the parent gates whether AnimatedNumber renders at all (Pitfall 1, 11-RESEARCH.md).
 *
 * String values (e.g. "72%") never animate — the typeof guard prevents passing a string to
 * useCountUp (Pitfall 2, 11-RESEARCH.md).
 *
 * Phase 25 (DSFD-03): Optional `icon`, `trend`, `progress` props enrich the card while
 * preserving backward compatibility — all existing DashboardPage call sites continue
 * working unchanged (no required prop additions, no DOM regression when optionals absent).
 *
 * Phase 30 (LAYOUT-02): Optional `to` prop makes the card a keyboard-accessible navigator.
 * When set, adds role="button", tabIndex, onClick, and onKeyDown (Enter/Space). Hobby Health
 * StatCards omit `to` and remain non-interactive.
 */
import type { ComponentType } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { useCountUp } from "@/hooks/useCountUp";

function AnimatedNumber({ value }: { value: number }) {
  const display = useCountUp(value);
  return <>{display}</>;
}

export interface StatCardProps {
  value: number | string;
  label: string;
  animate?: boolean;
  /** Phase 25 — Lucide icon component rendered above the value at size 16. */
  icon?: ComponentType<{ size?: number; className?: string }>;
  /** Phase 25 — optional trend line rendered below the label. */
  trend?: { value: number; label: string };
  /** Phase 25 — 0–100; renders a 2px faction-accent progress bar at card bottom. */
  progress?: number;
  /** Phase 30 — optional navigation target. When set, card becomes clickable. */
  to?: string;
}

export function StatCard({
  value,
  label,
  animate = false,
  icon: Icon,
  trend,
  progress,
  to,
}: StatCardProps) {
  const navigate = useNavigate();

  const displayValue =
    animate && typeof value === "number" ? (
      <AnimatedNumber value={value} />
    ) : (
      value
    );

  const baseClassName = "px-6 bg-card border border-border/60 shadow-sm transition-shadow duration-150 hover:shadow-md";
  const interactiveProps = to
    ? {
        role: "button" as const,
        tabIndex: 0,
        onClick: () => navigate({ to }),
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate({ to });
          }
        },
        className: `${baseClassName} cursor-pointer`,
      }
    : { className: baseClassName };

  return (
    <Card {...interactiveProps}>
      <CardContent className="flex flex-col gap-1 px-0">
        {Icon && <Icon size={16} className="text-muted-foreground mb-1" />}
        <span className="text-3xl font-semibold tabular-nums">{displayValue}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
        {trend && (
          <span className="text-xs text-muted-foreground tabular-nums">{trend.label}</span>
        )}
        {progress !== undefined && (
          <div className="mt-3">
            <div className="h-0.5 w-full rounded-full bg-border/40">
              <div
                className="h-0.5 rounded-full bg-faction-accent transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
