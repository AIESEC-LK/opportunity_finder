import type { Metadata } from "next";
import { EntityLogoPanel } from "@/components/entities/entity-logo";
import { PersonDetails } from "@/components/contact/person-details";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { ENTITY_CONTACTS, MCVP } from "@/lib/contact-directory";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach the Member Committee VP and local committee VPs for AIESEC in Sri Lanka entities.",
};

export default function ContactPage() {
  return (
    <div className="container-page py-8 sm:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <h1 className="mt-6 text-4xl font-semibold text-ink">Contact</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Speak with the national Incoming Global Volunteer team, or go straight to the local committee that hosts your
        project.
      </p>

      <section aria-labelledby="mcvp-heading" className="mt-10">
        <h2 id="mcvp-heading" className="text-2xl font-semibold text-ink">
          Member Committee
        </h2>
        <div className="mt-4 max-w-lg rounded-2xl border border-border bg-card p-6">
          <PersonDetails person={MCVP} />
        </div>
      </section>

      <section aria-labelledby="entities-heading" className="mt-14">
        <h2 id="entities-heading" className="text-2xl font-semibold text-ink">
          Local committees
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">LCVP contacts for each entity that hosts projects.</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ENTITY_CONTACTS.map((entity) => (
            <li key={entity.code} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
              <EntityLogoPanel team={{ code: entity.code, name: entity.name }} />
              <div className="px-1">
                <h3 className="text-lg font-semibold text-ink">{entity.shortName}</h3>
                <p className="text-sm text-muted-foreground">{entity.name}</p>
              </div>
              <ul className="space-y-4 border-t border-border px-1 pt-4">
                {entity.lcvps.map((person, index) => (
                  <li key={`${entity.code}-${person.role}-${index}`}>
                    <PersonDetails person={person} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
