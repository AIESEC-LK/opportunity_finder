"use client";

import { useId, useState } from "react";
import { EntityMark } from "@/components/entities/entity-logo";
import { SdgIcon } from "@/components/sdgs/sdg-icon";
import type { FacetCounts, Filters } from "@/lib/filters";
import { getSdg } from "@/lib/sdgs";
import { cn } from "@/lib/utils";
import type { HostTeam, OpportunityType } from "@/types/domain";

export interface FilterOptions {
  goals: number[];
  projects: { slug: string; name: string }[];
  hostTeams: HostTeam[];
  durations: number[];
  types: OpportunityType[];
}

interface FilterPanelProps {
  filters: Filters;
  options: FilterOptions;
  counts: FacetCounts;
  onChange: (patch: Partial<Filters>) => void;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <fieldset className="border-t border-border pt-5 first:border-t-0 first:pt-0" aria-describedby={hint ? id : undefined}>
      <legend className="text-sm font-semibold text-ink">{title}</legend>
      {hint && (
        <p id={id} className="mt-0.5 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <div className="mt-3 space-y-1">{children}</div>
    </fieldset>
  );
}

function Option({
  checked,
  onChange,
  count,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  count: number | undefined;
  children: React.ReactNode;
}) {
  const disabled = !checked && !count;
  return (
    <label
      className={cn(
        "flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-ink transition-colors hover:bg-muted",
        disabled && "cursor-default text-subtle hover:bg-transparent",
      )}
    >
      <input type="checkbox" className="size-4 shrink-0 accent-[var(--primary)]" checked={checked} onChange={onChange} disabled={disabled} />
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
      <span className="text-xs text-muted-foreground tabular-nums">{count ?? 0}</span>
    </label>
  );
}

function LongList<T>({ items, render, initial = 6 }: { items: T[]; render: (item: T) => React.ReactNode; initial?: number }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, initial);
  return (
    <>
      {shown.map(render)}
      {items.length > initial && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 ml-2 text-sm font-semibold text-primary hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </>
  );
}

export function FilterPanel({ filters, options, counts, onChange }: FilterPanelProps) {
  const datesActive = Boolean(filters.from || filters.to || filters.weeks.length);
  return (
    <div className="space-y-5">
      <Section title="Sustainable Development Goal">
        {options.goals.map((goal) => (
          <Option
            key={goal}
            checked={filters.goals.includes(goal)}
            onChange={() => onChange({ goals: toggle(filters.goals, goal).sort((a, b) => a - b) })}
            count={counts.goals.get(goal)}
          >
            <SdgIcon goal={goal} size={22} decorative />
            <span className="leading-snug">
              {goal}. {getSdg(goal)?.name}
            </span>
          </Option>
        ))}
      </Section>

      <Section title="Project">
        <LongList
          items={options.projects}
          render={(p) => (
            <Option
              key={p.slug}
              checked={filters.projects.includes(p.slug)}
              onChange={() => onChange({ projects: toggle(filters.projects, p.slug) })}
              count={counts.projects.get(p.slug)}
            >
              <span className="leading-snug">{p.name}</span>
            </Option>
          )}
        />
      </Section>

      <Section title="Entity">
        <LongList
          items={options.hostTeams}
          render={(h) => (
            <Option
              key={h.slug}
              checked={filters.hosts.includes(h.slug)}
              onChange={() => onChange({ hosts: toggle(filters.hosts, h.slug) })}
              count={counts.hosts.get(h.slug)}
            >
              <EntityMark team={h} size={22} className="rounded-md" />
              <span className="leading-snug">{h.name.replace(/^AIESEC in /, "")}</span>
            </Option>
          )}
        />
      </Section>

      {options.durations.length > 0 && (
        <Section title="Length of stay">
          {options.durations.map((weeks) => (
            <Option
              key={weeks}
              checked={filters.weeks.includes(weeks)}
              onChange={() => onChange({ weeks: toggle(filters.weeks, weeks).sort((a, b) => a - b) })}
              count={counts.weeks.get(weeks)}
            >
              About {weeks} weeks
            </Option>
          ))}
        </Section>
      )}

      <Section title="What's included">
        <Option checked={filters.meals} onChange={() => onChange({ meals: !filters.meals })} count={counts.meals}>
          Meals provided
        </Option>
      </Section>

      {options.types.length > 1 && (
        <Section title="Opportunity type">
          {options.types.map((type) => (
            <Option
              key={type}
              checked={filters.types.includes(type)}
              onChange={() => onChange({ types: toggle(filters.types, type) })}
              count={counts.types.get(type)}
            >
              {type === "IGV" ? "Global Volunteer (iGV)" : "Global Talent (iGT)"}
            </Option>
          ))}
        </Section>
      )}

      {datesActive && (
        <Section title="Dates">
          <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-muted">
            <input
              type="checkbox"
              className="size-4 accent-[var(--primary)]"
              checked={filters.flexible}
              onChange={() => onChange({ flexible: !filters.flexible })}
            />
            Include flexible or unlisted dates
          </label>
        </Section>
      )}
    </div>
  );
}
