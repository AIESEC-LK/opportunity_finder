# AIESEC Opportunity Finder

A web app for discovering AIESEC in Sri Lanka's incoming Global Volunteer (iGV) opportunities: start from a UN Sustainable Development Goal, explore its projects, filter opportunities by your travel dates, understand what's included, and apply.

**Opportunities come live from EXPA**, AIESEC's own system. The old Google Sheet still works as a fallback (`DATA_SOURCE=sheet`) while it is kept up to date. Nothing is invented, scraped or filled in. Built-in content: the 17 SDGs, the national planning links (`content/planning-links.json`) and the contact directory (`lib/contact-directory.ts`).

See [`docs/expa-migration.md`](docs/expa-migration.md) for how the data flows and how to roll back, and [`docs/sheet-removal-tradeoffs.md`](docs/sheet-removal-tradeoffs.md) for what changed for users.

- Next.js 16 (App Router), React 19, TypeScript (strict)
- Tailwind CSS 4, shadcn/ui (Base UI), Lucide icons, react-day-picker
- Zod for validating the normalised data, Vitest for tests

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Create `.env.local` with `EXPA_TOKEN=…` (see `.env.example`). Without it, pages show "temporarily unavailable". To use the old sheet instead, set `DATA_SOURCE=sheet`; that needs no token.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm run lint` | ESLint |
| `npm run inspect:source` | Fetch the live sheet and print how it was read (`-- --verbose` lists every opportunity, `-- --json` dumps the dataset) |
| `npm run probe:expa` | Read-only check of EXPA: available fields, counts, and how it compares with the sheet |
| `npm run archive:sheet` | Save the sheet-only data (booklets, photos, notes) to `content/sheet-archive/` |

## Where the data comes from

### What was inspected

- **Apps Script web app** (`…/macros/s/AKfycbxd…/exec`): an HTML page ("National iGV searchtool 26.27"). It loads its data with `google.script.run.getOpportunityData()`, which returns opportunities synced from EXPA (start/end dates, application close dates, openings). That function can only be called from inside the Apps Script page; the web app has no JSON endpoint, so this app cannot use it today. See [Using the Apps Script data](#using-the-apps-script-data-optional).
- **Spreadsheet** (`1j6IkDXwEbCLA2Jt2YYuJcL8E2YTnYjudADOAVxirjZI`): viewable by anyone with the link, which lets the server download it as `.xlsx`. The `.xlsx` export is used instead of CSV because CSV drops hyperlinks (every "Link" cell) and merged cells, and both carry meaning here.

### Sheet structure

| Tab | Used for |
| --- | --- |
| Welcome | Planning documents (Budget, Visa Guidelines, Country Booklet, …) |
| Projects | Opportunity listings |
| 4 Week GV Projects | Opportunity listings (4-week variants) |
| Food Provided | Meal details, joined to listings by opportunity number |
| Contact Sheet | Host team contacts shown on detail pages |
| Copy of Cover Page (hidden) | Ignored |

Listing tabs have the columns `#SDG`, `Project Name`, `Entity`, `Available Slots` (one column per year: 2025, 2026), `Project Link`, `Project Booklet`, `Accommodation`, `Food`. SDG, project and entity cells are merged down over the rows they group.

### Data model

- **Opportunity** = one row with a project link or booklet. Its id is the opportunity number in its `aiesec.org/opportunity/global-volunteer/<id>` link. Rows sharing an id (the same opportunity listed twice, or in both listing tabs) are merged. Rows with no link get a stable hash id from their content.
- **Project** = a unique project name (case and spacing ignored), e.g. HeartBeat, Global Classroom. Counted once even when it appears in several tabs.
- **SDG** = from the `#SDG` cell, e.g. `3.4` → Goal 3, target 3.4. An opportunity that belongs to one goal is never shown twice.
- **Entity** = the `Entity` cell (CC → AIESEC in Colombo Central, etc.), matched case-insensitively so "RUHUNA" and "Ruhuna" are one entity.
- **Type** = read from the link path (`global-volunteer` → iGV). All current listings are iGV; the sheet has no iGT listings, so the type filter stays hidden until it does.
- **Destination** = Sri Lanka. The sheet has no city column, so there is no city filter.
- **Title** = the sheet has no title column. Titles come from the link text when it names the placement ("Sri Bodhiraja College") or from the booklet file name with boilerplate removed ("USJ iGV Project Booklet - Heartbeat Ceylon Crystal House.pdf" → "Ceylon Crystal House"). Otherwise: "Project · host team".

### Dates

The slot columns are free text without years (`1 Jan - 12 Feb`, `Jan 12-Feb 12`, `5 Jan, 2026 - 16 Feb, 2026`, `Jan,Feb,Mar (Flexible)`, `Flexible Slots`). `lib/data/dates.ts` reads them with explicit rules: a written year wins; otherwise the column's year; ranges crossing New Year roll over; a list under "2026" that opens with Nov/Dec ranges and continues from January starts in the previous year. Month-only text becomes whole-month windows. Text that can't be read is kept and shown as written. Every date is handled as a plain `YYYY-MM-DD` value, so there are no timezone shifts.

A date search matches when any listed period overlaps the chosen one (`start <= chosenEnd && end >= chosenStart`). Listings that only say "flexible" or have no dates can't be checked; they are counted separately and can be included with one click.

### What's included

| Shown as | When |
| --- | --- |
| Included | The Food box is ticked, the text gives a meal count ("3 meals per day"), or says "provided" |
| Not included | The Food box is unticked, or the text says "not provided" |
| Not specified | Blank cells, unclear text ("3 meals per day provided (not covered)"), or tabs that disagree |

A link to accommodation photos is shown but not treated as proof that accommodation is included. The sheet has no fees, transport, airport pickup or visa columns; the UI says so instead of guessing.

`npm run inspect:source -- --verbose` shows how every row was read, including rows that were skipped and why.

## Caching

`lib/data/source.ts` keeps the normalised dataset in memory:

- Fresh for `DATA_CACHE_SECONDS` (10 minutes by default). Filtering runs on loaded data, so filter changes never fetch the sheet.
- After that, the cached copy is served while one background refresh runs.
- If a refresh fails, the last good copy is kept for up to `DATA_MAX_STALE_SECONDS`.
- With no good copy, pages show "temporarily unavailable" with a retry button. There is never fallback data.

The cache is per server process; on serverless hosting each instance keeps its own copy. Next.js Cache Components is deliberately off, so builds never depend on the sheet being reachable and a failed fetch is never cached.

Before anything is cached, the dataset is checked against a Zod schema (`lib/data/schema.ts`). If the sheet's layout changes in a way the reader can't handle, the site shows the unavailable state instead of wrong data.

## Configuring access

The default works while the sheet is shared as "Anyone with the link can view". If that changes:

1. **Publish to the web** (preferred): in the sheet, File → Share → Publish to web → Entire document → Microsoft Excel (.xlsx). Put the link in `GOOGLE_SHEET_XLSX_URL`.
2. **Keep it private**: add an authenticated fetch (Google Sheets/Drive API with a service account that has view access) in `fetchDataset` in `lib/data/source.ts`. Keep credentials server-side only.

If the sheet is restricted, Google returns a sign-in page; the app detects this and says the sheet isn't publicly readable.

### Using the Apps Script data (optional)

The Apps Script has richer EXPA data (exact slots, application close dates, openings). To expose it, the script owner can add a JSON branch to `doGet`:

```js
function doGet(e) {
  if (e && e.parameter && e.parameter.format === 'json') {
    return ContentService.createTextOutput(JSON.stringify(getOpportunityData()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // ...existing HTML response
}
```

A new adapter could then read `…/exec?format=json` and merge slots by opportunity id. This isn't built yet because the response can't be inspected until the endpoint exists.

### Reading straight from EXPA (the default)

With `EXPA_TOKEN` in `.env.local`, the app reads open Global Volunteer opportunities for committee `EXPA_COMMITTEE_ID` (1623, Sri Lanka) from EXPA's GraphQL API (`lib/data/expa.ts`, mapped by `lib/data/normalize-expa.ts`). Set `DATA_SOURCE=sheet` to go back to the sheet.

- **Token:** the public guest token aiesec.org's own search sends. It only sees public, open opportunities, and AIESEC can change it at any time; when that happens pages show "temporarily unavailable" until `EXPA_TOKEN` is updated. It is read on the server only (no `NEXT_PUBLIC_` prefix), so it never reaches the browser.
- **Freshness:** same cache as the sheet. EXPA is asked at most once per `DATA_CACHE_SECONDS`, on the first visit after the copy expires. EXPA offers no push updates that we could find with the public key, so this is not real time.
- **What you get:** exact slot dates with open places, project, SDG target, host team, meals and accommodation.
- **What you lose versus the sheet:** booklets, accommodation photos, host-team contacts and the Welcome-tab planning documents. Opportunities with no dated slots are hidden by EXPA's search.
- `npm run probe:expa` lists EXPA's fields and compares EXPA with the sheet without changing anything.

## Project structure

```
app/                    routes: /, /sdgs, /sdgs/[sdgSlug], /projects/[projectSlug],
                        /opportunities, /opportunities/[opportunityId]
components/
  opportunities/        search page, filters, date-range picker, cards, dates
  logistics/            "What's included?" panel and status pills
  projects/ sdgs/ site/ states/
lib/
  data/                 xlsx reader, normaliser, date parser, provisions, schema, source + cache
  filters/              filtering, overlap logic, facets, sorting, URL parameters
  catalog.ts views.ts   lookups and view models
  sdgs.ts               official SDG metadata
public/sdgs/            official UN SDG icons (sdgs.un.org)
public/brand/           AIESEC logos (from aiesec.lk); app/favicon.ico is the AIESEC human
public/entities/        each entity's own AIESEC logo (add files here; see Branding)
tests/                  unit tests and an in-memory xlsx builder
scripts/inspect-source.ts
```

## Deployment

Any Node host that runs `next start` works (Vercel, Render, a VM). No secrets are needed for the default setup.

## Branding

The look follows aiesec.lk: Poppins, AIESEC blue (`#037EF3`, with `#0A6FD1` for text and buttons so they meet WCAG AA contrast), the AIESEC logo in the navbar, the AIESEC human as favicon, and the same footer with a link to the Dev.Team site. Product naming lives in `lib/brand.ts`; entities and their names in `HOST_TEAMS` in `lib/data/config.ts`.

**Entity logos** live in `public/entities/` and are set per entity in `HOST_TEAMS` (`logo`, plus `logoOnDark` for logos with white lettering). Logos are looked up at render time, not stored with the cached sheet data. CC, CN, CS, Rajarata, Ruhuna, SLIIT and USJ have logos; Kandy, NIBM, NSBM and Wayamba show their name until a logo file is added. Give a replaced logo a new file name, because browsers and the Next.js image cache keep serving the old file for an unchanged URL.

The SDG icons are used under the UN's guidelines for informational use; the footer carries the required disclaimer.
