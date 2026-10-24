import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { MobileNav, NavLinks } from "./nav-links";

export function Wordmark() {
  return (
    // AIESEC logo clear space: 5mm on every side. The 4rem header leaves >5mm above and below the logo;
    // the left padding tops up the 1rem mobile page gutter, and the margin keeps 5mm before the divider.
    <Link href="/" className="group flex items-center rounded-md pl-[calc(5mm-1rem)] sm:pl-0" aria-label={`${BRAND.name}, home`}>
      <Image src="/brand/aiesec-logo.png" alt="AIESEC" width={1204} height={176} priority className="mr-[5mm] h-5 w-auto sm:h-6" />
      <div className="hidden items-center gap-3 border-l border-border pl-4 sm:flex">
        <span className="text-sm font-semibold text-ink transition-colors group-hover:text-primary">
          Opportunity Finder
        </span>
        <Image
          src="/brand/Logo_Black.png"
          alt="Sincerely Sri Lankan"
          width={3771}
          height={1526}
          priority
          className="h-6 w-auto object-contain sm:h-7"
        />
      </div>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Wordmark />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          <NavLinks />
          <Link
            href="/opportunities#search"
            className="ml-2 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand"
          >
            <Search className="size-4" aria-hidden />
            Search opportunities
          </Link>
        </nav>
        <MobileNav />
      </div>
    </header>
  );
}
