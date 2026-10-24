import { BedDouble, UtensilsCrossed, Sparkles } from "lucide-react";
import type { LogisticsBreakdown } from "@/lib/catalog";

interface StatPillProps {
  icon: React.ReactNode;
  count: number;
  total: number;
  label: string;
  colorClass: string;
  barColorClass: string;
}

function StatPill({ icon, count, total, label, colorClass, barColorClass }: StatPillProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
            {icon}
          </span>
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <span className="text-2xl font-bold tabular-nums text-ink">{count}</span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${barColorClass}`}
          style={{ width: `${pct}%` }}
          role="presentation"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {pct}% of {total} {total === 1 ? "opportunity" : "opportunities"}
      </p>
    </div>
  );
}

export function LogisticsBreakdownPanel({ breakdown }: { breakdown: LogisticsBreakdown }) {
  if (breakdown.total === 0) return null;
  return (
    <section aria-label="Logistics breakdown">
      <h2 className="mb-4 font-sans text-lg font-semibold text-ink">What&rsquo;s included</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatPill
          icon={<BedDouble className="size-4 text-sky-600 dark:text-sky-400" aria-hidden />}
          count={breakdown.withAccommodation}
          total={breakdown.total}
          label="With accommodation"
          colorClass="bg-sky-50 dark:bg-sky-950/40"
          barColorClass="bg-sky-500"
        />
        <StatPill
          icon={<UtensilsCrossed className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />}
          count={breakdown.withMeals}
          total={breakdown.total}
          label="With meals"
          colorClass="bg-amber-50 dark:bg-amber-950/40"
          barColorClass="bg-amber-500"
        />
        <StatPill
          icon={<Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />}
          count={breakdown.withAllLogistics}
          total={breakdown.total}
          label="Accommodation + meals"
          colorClass="bg-emerald-50 dark:bg-emerald-950/40"
          barColorClass="bg-emerald-500"
        />
      </div>
    </section>
  );
}
