import { z } from "zod";
import { isISODate } from "@/lib/format";

/**
 * Runtime contract for the normalised dataset. The normaliser is checked
 * against it before anything is cached or shown, so a change in the sheet
 * that produces malformed records fails loudly instead of rendering wrong data.
 */

const isoDate = z.string().refine(isISODate, "Expected a YYYY-MM-DD date");
const httpUrl = z.url({ protocol: /^https?$/ });

const provision = z.object({
  status: z.enum(["included", "not_included", "not_specified"]),
  detail: z.string().optional(),
  note: z.string().optional(),
  link: z.object({ label: z.string(), url: httpUrl }).optional(),
  sourceText: z.array(z.string()).optional(),
});

const dateRange = z
  .object({
    start: isoDate,
    end: isoDate,
    precision: z.enum(["day", "month"]),
    yearInferred: z.boolean(),
    raw: z.string(),
    weeks: z.number().int().positive().nullable(),
  })
  .refine((r) => r.start < r.end, "A range must end after it starts");

const hostTeam = z.object({ code: z.string().min(1), name: z.string().min(1), slug: z.string().min(1), });

export const opportunitySchema = z.object({
  id: z.string().min(1),
  expaId: z.string().regex(/^\d+$/).nullable(),
  title: z.string().min(1),
  titleSource: z.enum(["link-text", "booklet", "fallback", "expa"]),
  type: z.enum(["IGV", "IGT"]),
  typeSource: z.enum(["url", "sheet", "expa"]),
  projectKey: z.string().min(1),
  projectName: z.string().min(1),
  projectSlug: z.string().min(1),
  sdgTarget: z.string().nullable(),
  goals: z.array(z.number().int().min(1).max(17)),
  hostTeam: hostTeam.nullable(),
  country: z.string().min(1),
  applicationUrl: httpUrl.nullable(),
  applicationUrlIssue: z.string().nullable(),
  booklet: z.object({ label: z.string(), url: httpUrl.nullable() }).nullable(),
  provisions: z.object({ accommodation: provision, meals: provision }),
  dates: z.object({
    ranges: z.array(dateRange),
    flexible: z.boolean(),
    slotTexts: z.array(z.object({ label: z.string(), text: z.string() })),
    unparsed: z.array(z.string()),
  }),
  sources: z.array(z.object({ tab: z.string(), row: z.number().int().positive() })).min(1),
});

export const datasetSchema = z
  .object({
    opportunities: z.array(opportunitySchema),
    projects: z.array(
      z.object({
        key: z.string().min(1),
        slug: z.string().min(1),
        name: z.string().min(1),
        goals: z.array(z.number().int().min(1).max(17)),
        targets: z.array(z.string()),
        opportunityIds: z.array(z.string()).min(1),
        hostTeamCodes: z.array(z.string()),
      }),
    ),
    hostTeams: z.array(hostTeam),
    contacts: z.array(
      z.object({
        hostTeamCode: z.string(),
        person: z.string().nullable(),
        email: z.string().nullable(),
        whatsapp: z.string().nullable(),
        instagram: z.object({ label: z.string(), url: httpUrl.nullable() }).nullable(),
      }),
    ),
    resources: z.array(z.object({ label: z.string(), url: httpUrl })),
    diagnostics: z.unknown(),
    fetchedAt: z.string(),
    sourceUrl: httpUrl,
  })
  .superRefine((dataset, ctx) => {
    const ids = new Set<string>();
    for (const o of dataset.opportunities) {
      if (ids.has(o.id)) ctx.addIssue({ code: "custom", message: `Duplicate opportunity id ${o.id}` });
      ids.add(o.id);
    }
    const slugs = new Set<string>();
    for (const p of dataset.projects) {
      if (slugs.has(p.slug)) ctx.addIssue({ code: "custom", message: `Duplicate project slug ${p.slug}` });
      slugs.add(p.slug);
      for (const id of p.opportunityIds) {
        if (!ids.has(id)) ctx.addIssue({ code: "custom", message: `Project ${p.slug} references missing ${id}` });
      }
    }
  });
