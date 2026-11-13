import { Mail, Phone } from "lucide-react";
import type { OpportunityContact } from "@/types/domain";

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** The opportunity's contacts from EXPA. Each line is shown only when EXPA has it. */
export function ContactList({ contacts, hostTeamName }: { contacts: OpportunityContact[]; hostTeamName: string }) {
  return (
    <div className="space-y-3 border-t border-border pt-5 text-sm">
      <p className="font-semibold text-ink">Questions? Ask {hostTeamName}</p>
      <ul className="space-y-4">
        {contacts.map((c) => (
          <li key={`${c.name}-${c.email ?? c.phone ?? ""}`} className="space-y-1">
            <p className="font-semibold text-ink">{c.name}</p>
            {c.title && <p className="text-muted-foreground">{c.title}</p>}
            {c.phone && (
              <a href={telHref(c.phone)} className="flex items-center gap-2 text-primary hover:underline">
                <Phone className="size-4 shrink-0" aria-hidden />
                {c.phone}
              </a>
            )}
            {c.email && (
              <a href={`mailto:${c.email}`} className="flex min-w-0 items-center gap-2 text-primary hover:underline">
                <Mail className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{c.email}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
