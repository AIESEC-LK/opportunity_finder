# Moving from the Google Sheet to EXPA — developer guide

The opportunity finder now reads opportunities live from **EXPA** (AIESEC's own system) instead
of the national Google Sheet. The sheet reader is still in the code as a fallback: **we are not
ready to delete the sheet yet.** This guide covers where data comes from now, how to run and
roll back, and what is still open.

For the non-technical summary of what changed for users, see
[`sheet-removal-tradeoffs.md`](sheet-removal-tradeoffs.md).

## Where each piece of data comes from

| Data on the site | Source now | Where |
|---|---|---|
| Opportunity list, title, project, host team | EXPA | `lib/data/expa.ts` → `lib/data/normalize-expa.ts` |
| Dates and open places | EXPA slots (`available_slots`) | same |
| SDG goal and target | EXPA `sdg_info.sdg_target` | same |
| Meals and accommodation | EXPA `logistics_info` | same |
| Description and town | EXPA `description`, `location` | same (new — the sheet never had these) |
| National planning links (Visa Guidelines, Budget, Country Booklet, Country Content, Testimonials) | Data file | `content/planning-links.json` (checked by `lib/data/planning-links.ts`) |
| Host team contact on opportunity pages | Contact directory | `lib/contact-directory.ts` — only people marked `confirmed: true` are shown |
| Contact page (`/contact`) | Contact directory | `lib/contact-directory.ts` |
| Booklets, accommodation photos | **Not shown** — saved only | `content/sheet-archive/opportunity-extras.json` |

EXPA committee ids are mapped to the app's host teams in `LC_CODES`
(`lib/data/normalize-expa.ts`), e.g. 1340 → CS, 221 → USJ.

## Settings

All in `.env.local` locally, or the hosting provider's environment settings. See `.env.example`.

| Setting | Meaning |
|---|---|
| `DATA_SOURCE` | `expa` (default) or `sheet` (fallback) |
| `EXPA_TOKEN` | EXPA access token. **Secret-handling rules apply even to the public one:** never commit it, never log it, never prefix it with `NEXT_PUBLIC_`. |
| `EXPA_COMMITTEE_ID` | Committee whose open GV opportunities are listed. Default `1623` (Sri Lanka). |
| `DATA_CACHE_SECONDS` | How long a fetched copy is fresh (default 600). Old name `SHEET_CACHE_SECONDS` still works. |
| `DATA_MAX_STALE_SECONDS` | How long an old copy may be served if EXPA fails (default 86400). |
| `DATA_FETCH_TIMEOUT_MS` | Timeout for one fetch (default 20000). |

**Freshness:** not real time. EXPA is asked at most once per `DATA_CACHE_SECONDS`, on the first
visit after the copy expires. Changing filters never calls EXPA. We found no push/webhook
feature in what the public token can see (checked with GraphQL introspection, 2026-11-11);
webhooks set up elsewhere in EXPA, or visible only to a private key, can't be ruled out.

## The token

Today we use the **public guest token** that aiesec.org's own search sends from the browser.

- It only sees public, open opportunities. Committee details, closed or unpublished
  opportunities and member data return "not authorized".
- AIESEC can change it at any time. When that happens, the site keeps serving the last good copy
  for `DATA_MAX_STALE_SECONDS`, then shows "temporarily unavailable" until `EXPA_TOKEN` is updated.
- An official (private) key is being requested. Switching is just a new `EXPA_TOKEN` value.

### Testing a private key

1. Put the new key in `.env.local` as `EXPA_TOKEN`.
2. Run `npm run probe:expa`. Compare with the public-key baseline (2026-11-11):
   192 open GV opportunities; 122 also in the sheet; 41 sheet opportunities hidden
   ("not authorized"); 32 open but with no dated slots; 3 deleted.
3. If the 41 hidden ones now appear, decide whether closed/unpublished opportunities should be
   listed at all. The query filters on `status: "open"` (`lib/data/expa.ts`), so it may need a
   change to include them.
4. Click through the site with `npm run dev`.

## Rolling back

**Phase 1 (now, while the sheet is still kept up to date):** set `DATA_SOURCE=sheet` and restart
the server. No code change. Everything returns to exactly how it was, including booklets and
the sheet's contact details. Only works while someone still updates the sheet.

**Phase 2 (after the sheet code is deleted — not done yet):** before deleting, tag the last
commit that still has the sheet reader, e.g. `git tag sheet-source-final`. To restore, revert
the deletion commit (`git revert <commit>`) or check out the tagged files.

## Saved sheet data

`npm run archive:sheet` reads the sheet once and writes:

- `content/sheet-archive/opportunity-extras.json` (**committed**) — per opportunity id: booklet
  link and label, accommodation photo link, flexible-dates flag, the sheet's slot text, title
  and SDG target. Google's sharer ids and tracking parameters are stripped from links.
- `.plans/expa-v2/contacts-archive.json` (**local only, git-ignored**) — the sheet's Contact
  tab. It contains members' names, WhatsApp numbers and emails, and **this repository is
  public**, so it must never be committed. It is on the computer of whoever ran the script;
  hand it to the person who owns contacts.

Re-run it before the sheet is switched off so the archive is as fresh as possible.

## Known gaps and issues

- **Opportunities with no dated slots are not listed.** EXPA's search leaves them out (32 on
  2026-11-11). Old links to them show "not found". Fix: host teams add slots in EXPA.
- **Booklets and accommodation photos are not shown.** The data is saved (above). If booklets
  return, show them as a "View booklet" / "More info" button **alongside** the EXPA
  description, not instead of it — the detail page already renders both when both exist.
- **Contact directory still has placeholder people.** `lib/contact-directory.ts` holds made-up
  names and numbers (all `confirmed: false`). Opportunity pages hide them, but the `/contact`
  page still displays them. Replace them with real, approved details and set `confirmed: true`.
  Remember the repo is public: only add details the team agrees can be public.
- **Sheet-only notes are gone:** "flexible dates" wording, per-team WhatsApp/Telegram/Instagram.
- **SDG targets can differ** from the sheet (EXPA's value is used, e.g. 3.1 instead of 3.4).

## Future work (each needs its own research first)

1. **Letting teams add booklet / photo links without code** — options include an admin form,
   a data file edited via pull requests, or EXPA fields if a private key exposes them.
2. **An editable contacts system** — needed especially if contacts differ per opportunity or
   per committee rather than one LCVP per host team.
3. **Deleting the sheet code** — after a trial period on EXPA with the sheet as fallback, tag
   and remove `lib/data/xlsx.ts`, `normalize.ts`, `dates.ts`, `titles.ts`, `provisions.ts`, the
   sheet scripts and tests, and the `DATA_SOURCE` switch.

## Useful commands

| Command | What it does |
|---|---|
| `npm run probe:expa` | Read-only: EXPA's fields, counts, and comparison with the sheet |
| `npm run archive:sheet` | Save the sheet-only data (see above) |
| `npm run inspect:source` | Show how the sheet is read (always reads the sheet) |
| `npm test` / `npm run typecheck` / `npm run lint` | Checks |
