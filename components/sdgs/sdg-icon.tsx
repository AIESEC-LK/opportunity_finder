import Image from "next/image";
import { getSdg } from "@/lib/sdgs";
import { cn } from "@/lib/utils";

interface SdgIconProps {
  goal: number;
  size: number;
  className?: string;
  /** Set when a visible label next to the icon already names the goal. */
  decorative?: boolean;
  priority?: boolean;
}

/** The official UN icon. Never recoloured or redrawn. */
export function SdgIcon({ goal, size, className, decorative, priority }: SdgIconProps) {
  const sdg = getSdg(goal);
  if (!sdg) return null;
  return (
    <Image
      src={sdg.icon}
      width={size}
      height={size}
      alt={decorative ? "" : `SDG ${sdg.number}: ${sdg.name}`}
      priority={priority}
      sizes={`${size}px`}
      className={cn("shrink-0 rounded-[10%]", className)}
    />
  );
}

export function SdgLabel({ goal, target, size = 22, className }: { goal: number; target?: string | null; size?: number; className?: string }) {
  const sdg = getSdg(goal);
  if (!sdg) return null;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground", className)}>
      <SdgIcon goal={goal} size={size} decorative />
      <span className="truncate">
        <span className="font-semibold text-ink">SDG {target && target.startsWith(`${goal}.`) ? target : goal}</span> · {sdg.name}
      </span>
    </span>
  );
}
