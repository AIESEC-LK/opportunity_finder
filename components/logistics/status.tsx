import { Check, CircleHelp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProvisionStatus } from "@/types/domain";

export const STATUS_COPY: Record<ProvisionStatus, string> = {
  included: "Included",
  not_included: "Not included",
  not_specified: "Not specified",
};

const STYLES: Record<ProvisionStatus, string> = {
  included: "bg-included-soft text-included",
  not_included: "bg-excluded-soft text-excluded",
  not_specified: "bg-unknown-soft text-unknown",
};

const ICONS = { included: Check, not_included: X, not_specified: CircleHelp };

export function StatusPill({ status, className }: { status: ProvisionStatus; className?: string }) {
  const Icon = ICONS[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold", STYLES[status], className)}>
      <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />
      {STATUS_COPY[status]}
    </span>
  );
}
