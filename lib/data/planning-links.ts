/**
 * National planning links (Visa Guidelines, Budget, Country Booklet, …),
 * the same for every opportunity. Edit content/planning-links.json to change
 * them; the file is checked here so a typo fails loudly instead of rendering
 * a broken link.
 */
import { z } from "zod";
import type { ResourceLink } from "@/types/domain";
import raw from "@/content/planning-links.json";

const planningLinksSchema = z.array(
  z.object({
    label: z.string().min(1),
    url: z.url({ protocol: /^https$/ }),
  }),
);

export const PLANNING_LINKS: ResourceLink[] = planningLinksSchema.parse(raw);
