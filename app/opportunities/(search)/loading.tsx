export default function Loading() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-label="Loading opportunities">
      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-10 w-72 animate-pulse rounded-lg bg-muted" />
      <div className="mt-6 h-28 animate-pulse rounded-3xl bg-muted" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <p className="sr-only">Loading opportunities…</p>
    </div>
  );
}
