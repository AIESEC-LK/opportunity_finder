"use client";

import { useState } from "react";
import { Mail, Phone, User, Eye } from "lucide-react";
import type { DirectoryPerson } from "@/lib/contact-directory";

function telHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

function Field({
  icon: Icon,
  value,
  placeholder,
  href,
}: {
  icon: typeof User;
  value: string | null;
  placeholder: string;
  href?: string | null;
}) {
  const className = value ? "text-ink" : "italic text-muted-foreground";
  const label = value ?? placeholder;
  return (
    <li className="flex min-w-0 items-center gap-2.5 text-sm">
      <Icon className="size-4 shrink-0 text-brand" aria-hidden />
      {href && value ? (
        <a href={href} className="truncate text-primary hover:underline">
          {label}
        </a>
      ) : (
        <span className={`truncate ${className}`}>{label}</span>
      )}
    </li>
  );
}

function PhoneField({ phone }: { phone: string | null }) {
  const [revealed, setReveal] = useState(false);

  if (!phone) {
    return (
      <li className="flex min-w-0 items-center gap-2.5 text-sm">
        <Phone className="size-4 shrink-0 text-brand" aria-hidden />
        <span className="truncate italic text-muted-foreground">contact number</span>
      </li>
    );
  }

  const href = telHref(phone);

  return (
    <li className="flex min-w-0 items-center gap-2.5 text-sm">
      <Phone className="size-4 shrink-0 text-brand" aria-hidden />
      {revealed ? (
        href ? (
          <a href={href} className="truncate text-primary hover:underline">
            {phone}
          </a>
        ) : (
          <span className="truncate text-ink">{phone}</span>
        )
      ) : (
        <button
          type="button"
          onClick={() => setReveal(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Reveal contact number"
        >
          <Eye className="size-3.5" aria-hidden />
          Show number
        </button>
      )}
    </li>
  );
}

export function PersonDetails({ person }: { person: DirectoryPerson }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{person.role}</p>
      <ul className="mt-2 space-y-2">
        <Field icon={User} value={person.name} placeholder={`${person.role} name`} />
        <Field icon={Mail} value={person.email} placeholder="email address" href={person.email ? `mailto:${person.email}` : null} />
        <PhoneField phone={person.phone} />
      </ul>
    </div>
  );
}
