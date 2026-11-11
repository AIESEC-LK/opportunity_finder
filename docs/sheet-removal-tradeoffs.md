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

We tested two kinds of access key on 11 Nov 2026:

| | Public key (what aiesec.org uses) | Private key |
|---|---|---|
| Opportunities shown | 192 | 263 |
| Opportunities with no dates in EXPA | hidden | shown as "Dates not listed" (52) |

- **With the public key, opportunities with no dates in EXPA are hidden** (32 of the sheet's).
  With the private key they appear, marked "Dates not listed — ask the host team".
  Either way, **host teams should add their slots (dates) in EXPA.**
- **Closed opportunities are not shown** with either key. That's on purpose: you can't apply
  to them.

**About the private key:** the one we tested belongs to a person's EXPA account. It can change
data in EXPA, not just read it, so it must be kept as secret as a password. It may also stop
working after some time. A key made for apps is better if AIESEC can give us one.

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

1. Decide which key the live site uses (see above).
2. Add real contact details.
3. Research a way for host teams to add booklet and photo links themselves.
4. **Contacts straight from EXPA.** The private key can see who manages each opportunity
   (name and email) and each host team's office email and phone. That could replace the
   hand-typed contacts and give each opportunity its own contact. We have **not** turned this
   on, because the sheet never published these people's details. The team needs to agree
   what can be public first.
5. After a trial period, remove the sheet for good.
