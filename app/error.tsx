"use client";

import { RotateCw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page py-20">
      <div role="alert" className="mx-auto max-w-lg text-center">
        <h1 className="text-3xl font-semibold text-ink">Something went wrong</h1>
        <p className="mt-3 text-muted-foreground">This page couldn&rsquo;t be shown. Please try again in a moment.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
        >
          <RotateCw className="size-4" aria-hidden />
          Try again
        </button>
      </div>
    </div>
  );
}
