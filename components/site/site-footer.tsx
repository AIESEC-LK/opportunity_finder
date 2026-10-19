import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { SOCIAL_LINKS } from "./social-links";

const QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/opportunities", label: "Explore opportunities" },
  { href: "/sdgs", label: "Sustainable Development Goals" },
  { href: "https://www.aiesec.lk/", label: "AIESEC in Sri Lanka" },
  { href: "https://www.aiesec.lk/privacy-and-cookie-policy", label: "Privacy and Cookie Policy" },
];

/** Mirrors the aiesec.lk footer: about text, quick links, contact details and socials. */
export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-gradient-to-br from-paper via-white to-paper">
      <div className="container-page py-14">
        <div className="flex flex-col justify-between gap-12 lg:flex-row">
          <div className="max-w-md space-y-4">
            <Image src="/brand/aiesec-logo-black.avif" alt="AIESEC" width={1265} height={259} className="mb-[5mm] h-10 w-auto" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              AIESEC is a global platform for young people to develop their leadership potential through international
              internships and volunteer opportunities. Founded in 1948 and currently present in 110+ countries and
              territories, AIESEC is a non-governmental, and not-for-profit organization entirely run by youth for youth.
              AIESEC Sri Lanka was established in 1995, as a member chapter of AIESEC International.
            </p>
            <ul className="flex gap-3 pt-1">
              {SOCIAL_LINKS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`AIESEC in Sri Lanka on ${s.label}`}
                    className="flex size-10 items-center justify-center rounded-full bg-muted text-ink transition-all duration-300 hover:scale-110 hover:bg-brand hover:text-white"
                  >
                    <svg viewBox={s.viewBox} className="size-5" fill="currentColor" aria-hidden>
                      <path d={s.path} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-base font-semibold text-ink">Quick Links</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {QUICK_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-muted-foreground transition-colors hover:text-primary">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">Contact Us</h2>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>
                  <a href="mailto:srilanka@aiesec.net" className="flex items-center gap-2.5 transition-colors hover:text-primary">
                    <Mail className="size-4 text-brand" aria-hidden />
                    srilanka@aiesec.net
                  </a>
                </li>
                <li>
                  <a href="tel:+94112746190" className="flex items-center gap-2.5 transition-colors hover:text-primary">
                    <Phone className="size-4 text-brand" aria-hidden />
                    +94 112 746 190
                  </a>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                  102/2, Nagahawatta Road, Maharagama, 10280
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            Made with Love <span aria-label="love">💗</span> by{" "}
            <a
              href="https://devteam.aiesec.lk"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              &lt;/Dev.Team&gt;
            </a>{" "}
            of AIESEC in Sri Lanka
          </p>
          <p className="text-xs text-subtle md:max-w-md md:text-right">
            SDG icons from the United Nations. This site&rsquo;s content has not been approved by the UN and does not reflect
            its views.
          </p>
        </div>
      </div>
    </footer>
  );
}
