"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const LINKS = [
  { href: "/opportunities", label: "Explore opportunities" },
  { href: "/sdgs", label: "Sustainable Development Goals" },
  { href: "/contact", label: "Contact" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks() {
  const pathname = usePathname();
  return LINKS.map((link) => (
    <Link
      key={link.href}
      href={link.href}
      aria-current={isActive(pathname, link.href) ? "page" : undefined}
      className={cn(
        "rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-ink",
        isActive(pathname, link.href) && "text-primary",
      )}
    >
      {link.label === "Sustainable Development Goals" ? "SDGs" : link.label}
    </Link>
  ));
}

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-muted md:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] max-w-sm bg-white">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-heading text-lg">Menu</SheetTitle>
        </SheetHeader>
        <nav aria-label="Main" className="flex flex-col gap-1 px-3">
          <Link
            href="/opportunities#search"
            onClick={() => setOpen(false)}
            className="mb-2 flex h-12 items-center gap-3 rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground"
          >
            <Search className="size-4" aria-hidden />
            Search opportunities
          </Link>
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className={cn(
                "flex h-12 items-center rounded-xl px-4 text-base font-medium text-ink hover:bg-muted",
                isActive(pathname, link.href) && "bg-muted",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
