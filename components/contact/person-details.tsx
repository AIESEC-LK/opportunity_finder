import { Mail, Phone, User } from "lucide-react";
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

export function PersonDetails({ person }: { person: DirectoryPerson }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{person.role}</p>
      <ul className="mt-2 space-y-2">
        <Field icon={User} value={person.name} placeholder={`${person.role} name`} />
        <Field icon={Mail} value={person.email} placeholder="email address" href={person.email ? `mailto:${person.email}` : null} />
        <Field icon={Phone} value={person.phone} placeholder="contact number" href={person.phone ? telHref(person.phone) : null} />
      </ul>
    </div>
  );
}
