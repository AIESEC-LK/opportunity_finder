"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { DateRangePicker } from "@/components/opportunities/date-range-picker";
import { DEFAULT_FILTERS, toSearchParams } from "@/lib/filters";
import type { ISODate } from "@/types/domain";

export function HeroSearch({ today }: { today: ISODate }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState<ISODate | null>(null);
  const [to, setTo] = useState<ISODate | null>(null);

  return (
    <form
      role="search"
      aria-label="Find opportunities"
      onSubmit={(e) => {
        e.preventDefault();
        const params = toSearchParams({ ...DEFAULT_FILTERS, q, from, to }).toString();
        router.push(`/opportunities${params ? `?${params}` : ""}`);
      }}
      className="grid gap-3 rounded-3xl border border-border bg-card p-4 shadow-[0_18px_50px_-30px_rgba(27,36,48,0.45)] sm:grid-cols-2 sm:p-5"
    >
      <div className="sm:col-span-2">
        <label htmlFor="hero-q" className="mb-1.5 block text-sm font-semibold text-ink">
          Search Project
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id="hero-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Project name, entity, or SDG goal…"
            className="h-12 w-full rounded-xl border border-input bg-card pr-3 pl-10 text-[0.95rem] shadow-xs placeholder:text-subtle focus-visible:border-primary"
          />
        </div>
      </div>
      <DateRangePicker id="hero-dates" label="When can you go?" from={from} to={to} today={today} onChange={(f, t) => (setFrom(f), setTo(t))} />
      <div className="flex items-end">
        <button type="submit" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90">
          <Search className="size-4" aria-hidden />
          Search
        </button>
      </div>
    </form>
  );
}
