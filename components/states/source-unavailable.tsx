"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CloudOff, RotateCw } from "lucide-react";

/** Shown instead of any listings when the source can't be loaded. There is no fallback data. */
export function SourceUnavailable() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="container-page py-16">
      <div role="alert" className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-8 text-center">
        <CloudOff className="mx-auto size-9 text-muted-foreground" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold text-ink">The opportunity list is temporarily unavailable</h1>
        <p className="mt-3 text-muted-foreground">
          We couldn&rsquo;t load the latest opportunities from AIESEC in Sri Lanka. Please try again in a moment.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => startTransition(() => router.refresh())}
            disabled={pending}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
          >
            <RotateCw className={pending ? "size-4 animate-spin" : "size-4"} aria-hidden />
            {pending ? "Trying again…" : "Try again"}
          </button>
        </div>
      </div>
    </div>
  );
}
