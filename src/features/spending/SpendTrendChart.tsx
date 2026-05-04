/**
 * Phase 19 (ANLY-06, ANLY-07) — Monthly spend trend bar chart.
 *
 * Wraps Recharts BarChart in shadcn ChartContainer. Always renders 12 bars
 * (the parent only renders the chart in the !isEmpty branch — see Pitfall 7).
 *
 * Color contract (UI-SPEC §Color): bar fill is `var(--color-pence)` injected
 * by ChartContainer from `chartConfig.pence.color`. We use the shadcn chart
 * token `hsl(var(--chart-1))` so the chart stays visually stable across
 * faction theme changes (anti-pattern: applying faction-accent here).
 *
 * Currency contract (integer pence discipline): the Y-axis tick formatter
 * and tooltip both use `formatCurrency()` — the only valid /100 site in the
 * codebase. Raw pence MUST NOT appear in the rendered DOM.
 *
 * Zero-state contract: when every entry has pence === 0, the 12 zero-height
 * bars still render and a muted note prompts the user to add purchase_date
 * data. Per UI-SPEC: "Add purchase dates to units and paints to see trends".
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/formatCurrency";

interface SpendTrendChartProps {
  data: { month: string; pence: number }[];
}

const chartConfig = {
  pence: {
    label: "Spend",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function SpendTrendChart({ data }: SpendTrendChartProps) {
  const allZero = data.length > 0 && data.every((d) => d.pence === 0);

  return (
    <div className="flex flex-col gap-2">
      <ChartContainer config={chartConfig} className="h-60 w-full">
        <BarChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tickFormatter={(value: number) => formatCurrency(value)}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => formatCurrency(Number(value))}
              />
            }
          />
          <Bar
            dataKey="pence"
            fill="var(--color-pence)"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
      {allZero && (
        <p className="text-sm text-muted-foreground text-center">
          Add purchase dates to units and paints to see trends
        </p>
      )}
    </div>
  );
}
