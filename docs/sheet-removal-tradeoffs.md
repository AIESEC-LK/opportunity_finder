# Moving the Opportunity Finder off the Google Sheet — what changes

**Short version:** the site now takes its opportunities straight from EXPA instead of the
national Google Sheet. Most things get better. A few things the sheet provided are not shown for
now, and we are keeping the sheet as a backup until we're confident. Nothing has been deleted.

## Why

The national sheet is being discontinued. It was also typed by hand, so it went out of date:
many listed dates had already passed, some closed opportunities were still listed, and new ones
were missing.

## What gets better

- **Live data.** The site checks EXPA about every 10 minutes, so new or closed opportunities show
  up without anyone editing a sheet.
- **Exact dates.** Each opportunity shows its real start and end dates and how many places are
  open, instead of free text like "Jan, Feb (Flexible)".
- **More opportunities.** On 11 Nov 2026, EXPA had 70 open Sri Lankan opportunities that were
  not in the sheet.
- **A description.** Each opportunity now shows what volunteers will actually do, written by the
  host team in EXPA, plus the town it's in.

## What we had to give up — for now

| What | What users see now | Is the data lost? |
|---|---|---|
| **Project booklets** | No "Read the booklet" button | No — all 186 links are saved in the project |
| **Accommodation photos** | No "See photos" link | No — all links are saved |
| **Host team contact details from the sheet** (WhatsApp, Telegram, Instagram) | No contact box on opportunity pages until the team adds confirmed contacts | Saved privately, not published |
| **"Flexible dates" notes** | Only exact dates from EXPA | Saved |

These need to be **added back** later. We will need a simple way for host teams to add booklet
and photo links themselves, without a developer. That needs its own research before we build it.

## Opportunities that won't appear

- **Opportunities with no dates in EXPA** (32 on 11 Nov 2026). EXPA's search hides them.
  **Fix:** host teams add their slots (dates) in EXPA, and they appear automatically.
- **Closed or unpublished opportunities** (41). We currently use the same public access that
  aiesec.org uses, which only sees open, published opportunities. With an official AIESEC key
  (being requested) some of these may come back — we'll test that.

## What the team needs to look after now

| Thing | Who | Where |
|---|---|---|
| Dates, open places, descriptions, meals and accommodation | Host teams | **In EXPA** (the site reads it automatically) |
| Contact person for each host team | National team | `lib/contact-directory.ts` in the project — needs real, approved details. The current names there are placeholders. |
| National planning links (Visa, Budget, Country Booklet, …) | National team | `content/planning-links.json` in the project |

Because the project's code is public, only add contact details that are fine to be public.

## Safety net

- **The sheet still works as a backup.** If EXPA has problems, a developer can switch the site
  back to the sheet in a minute, as long as someone is still updating the sheet.
- If EXPA is briefly down, the site keeps showing the last good copy for up to a day.
- The access key we use today is public and AIESEC could change it. If that happens the site
  shows "temporarily unavailable" until a developer updates it. An official key fixes this.

## What comes next

1. Test with an official AIESEC key, and see whether the missing opportunities appear.
2. Add real contact details.
3. Research a way for host teams to add booklet and photo links themselves.
4. Research editable contacts, especially if each opportunity or committee needs its own contact.
5. After a trial period, remove the sheet for good.
