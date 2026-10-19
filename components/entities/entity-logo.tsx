import Image from "next/image";
import { cn } from "@/lib/utils";
import { HOST_TEAMS } from "@/lib/data/config";
import type { HostTeam } from "@/types/domain";

type Team = Pick<HostTeam, "code" | "name">;

const shortName = (team: Team) => team.name.replace(/^AIESEC in /, "");

/** Logos are presentation, so they are looked up at render time rather than stored with the data. */
function branding(team: Team): { logo: string | null; logoOnDark: boolean } {
  const info = HOST_TEAMS[team.code.toUpperCase()];
  return { logo: info?.logo ?? null, logoOnDark: Boolean(info?.logoOnDark) };
}

/**
 * Small logo tile: the entity's logo, or its code when no logo is available.
 * Tiles are twice as wide as they are tall so wide logos (Ruhuna, Rajarata) stay legible.
 */
export function EntityMark({ team, size, className }: { team: Team; size: number; className?: string }) {
  const { logo, logoOnDark } = branding(team);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border",
        logoOnDark ? "bg-ink" : "bg-white",
        className,
      )}
      style={{ width: size * 2, height: size }}
    >
      {logo ? (
        <Image src={logo} alt="" width={size * 4} height={size * 2} sizes={`${size * 2}px`} className="h-full w-full object-contain p-[6%]" />
      ) : (
        <span className="text-[0.6rem] font-bold text-primary">{team.code.slice(0, 4).toUpperCase()}</span>
      )}
    </span>
  );
}

/** Logo area for entity cards: the entity's own logo, or its name when no logo is available. */
export function EntityLogoPanel({ team, className }: { team: Team; className?: string }) {
  const { logo, logoOnDark } = branding(team);
  return (
    <span className={cn("flex h-28 items-center justify-center rounded-xl px-4", logoOnDark ? "bg-ink" : "bg-white ring-1 ring-border", className)}>
      {logo ? (
        <Image src={logo} alt={team.name} width={320} height={160} sizes="200px" className="max-h-20 w-auto max-w-full object-contain" />
      ) : (
        <span className="text-center text-lg leading-tight font-semibold text-primary">{shortName(team)}</span>
      )}
    </span>
  );
}
