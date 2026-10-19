import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-lg text-center">
        <Compass className="mx-auto size-10 text-muted-foreground" aria-hidden />
        <h1 className="mt-4 text-3xl font-semibold text-ink">We couldn&rsquo;t find that page</h1>
        <p className="mt-3 text-muted-foreground">
          The opportunity may no longer be listed, or the link may be mistyped.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/opportunities" className="inline-flex h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground">
            Browse opportunities
          </Link>
          <Link href="/sdgs" className="inline-flex h-11 items-center rounded-xl border border-input px-5 font-semibold text-ink">
            Explore the SDGs
          </Link>
        </div>
      </div>
    </div>
  );
}
