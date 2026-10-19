import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 && <ChevronRight className="size-3.5 shrink-0 text-subtle" aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="rounded hover:text-ink hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate font-medium text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
