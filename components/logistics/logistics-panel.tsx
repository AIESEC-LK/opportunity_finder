import { BedDouble, BusFront, ExternalLink, FileText, GraduationCap, PlaneLanding, Stamp, UtensilsCrossed, Wallet } from "lucide-react";
import { StatusPill } from "@/components/logistics/status";
import { cn } from "@/lib/utils";
import type { Provision, Provisions, ResourceLink } from "@/types/domain";

const ITEMS = [
  { key: "accommodation", label: "Accommodation", icon: BedDouble },
  { key: "meals", label: "Food and meals", icon: UtensilsCrossed },
] as const;

/** Provisions the listings never cover. Shown so nobody assumes either way. */
const NOT_IN_SHEET = [
  { label: "Local transport", icon: BusFront },
  { label: "Airport pickup", icon: PlaneLanding },
  { label: "Visa support", icon: Stamp },
  { label: "Training and orientation", icon: GraduationCap },
];

function ProvisionCard({ label, icon: Icon, provision }: { label: string; icon: typeof BedDouble; provision: Provision }) {
  const tone =
    provision.status === "included"
      ? "border-included/25"
      : provision.status === "not_included"
        ? "border-excluded/25"
        : "border-dashed border-input";
  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:p-5", tone)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-ink">
            <Icon className="size-5" aria-hidden />
          </span>
          <div>
            <h3 className="font-sans text-base font-semibold text-ink">{label}</h3>
            {provision.detail && <p className="text-sm font-medium text-included">{provision.detail}</p>}
          </div>
        </div>
        <StatusPill status={provision.status} className="shrink-0" />
      </div>
      {provision.note && <p className="text-sm leading-relaxed text-muted-foreground">{provision.note}</p>}
      {provision.link && (
        <a
          href={provision.link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          {provision.link.label}
          <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
    </div>
  );
}

export function LogisticsPanel({ provisions, budget }: { provisions: Provisions; budget?: ResourceLink }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <ProvisionCard key={item.key} label={item.label} icon={item.icon} provision={provisions[item.key]} />
        ))}
      </div>

      <div className="rounded-2xl bg-muted/70 p-4 sm:p-5">
        <h3 className="font-sans text-sm font-semibold text-ink">Ask the host team about</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {NOT_IN_SHEET.map(({ label, icon: Icon }) => (
            <li key={label} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-ink">
              <Icon className="size-4 text-muted-foreground" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-ink">
          <Wallet className="size-5" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h3 className="font-sans text-base font-semibold text-ink">Participant costs</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Not listed. Confirm fees, flights, visas and insurance with the host team.
          </p>
          {budget && (
            <a
              href={budget.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <FileText className="size-4" aria-hidden />
              AIESEC in Sri Lanka&rsquo;s budget guide
              <ExternalLink className="size-3.5" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
