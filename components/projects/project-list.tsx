"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ProjectCard, type ProjectCardModel } from "@/components/projects/project-card";
import { plural } from "@/lib/format";

type Sort = "name" | "opportunities" | "soonest";

export function ProjectList({ projects }: { projects: ProjectCardModel[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("opportunities");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = projects.filter((p) => !q || p.name.toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "soonest") return (a.soonestStart ?? "9999").localeCompare(b.soonestStart ?? "9999") || a.name.localeCompare(b.name);
      return b.opportunityCount - a.opportunityCount || a.name.localeCompare(b.name);
    });
  }, [projects, query, sort]);

  return (
    <div className="space-y-5">
      {projects.length > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <label htmlFor="project-search" className="sr-only">
              Search projects
            </label>
            <input
              id="project-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects"
              className="h-11 w-full rounded-xl border border-input bg-card pr-3 pl-10 shadow-xs placeholder:text-subtle focus-visible:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="project-sort" className="text-sm text-muted-foreground">
              Sort by
            </label>
            <select
              id="project-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-11 rounded-xl border border-input bg-card px-3 text-sm font-medium text-ink shadow-xs"
            >
              <option value="opportunities">Most opportunities</option>
              <option value="soonest">Earliest upcoming date</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {plural(visible.length, "project")} shown
      </p>
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-input bg-card/60 px-6 py-10 text-center">
          <p className="font-medium text-ink">No projects match &ldquo;{query}&rdquo;.</p>
          <button type="button" onClick={() => setQuery("")} className="mt-2 text-sm font-semibold text-primary hover:underline">
            Clear search
          </button>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.map((p) => (
            <li key={p.slug}>
              <ProjectCard project={p} headingLevel="h2" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
