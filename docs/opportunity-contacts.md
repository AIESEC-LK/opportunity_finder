# Who is shown as a contact on an opportunity

Each opportunity page lists the people an applicant can ask about it. They are picked from that
opportunity's **managers in EXPA**. Nobody is typed in by hand.

Code: `pickContacts` in `lib/data/normalize-expa.ts`. Tests: `tests/pick-contacts.test.ts`.

## The rule

Only managers with a **current** role are ever considered. A role is current when it is
`active`, has started, and hasn't ended.

People are added in three groups, in this order. Inside each group, EXPA's order is kept.

| Order | Who | How many |
|---|---|---|
| 1 | **National team in iGV:** role MCVP or ESTL, at the MC (national office), function ICX | All of them, always |
| 2 | **The host LC's iGV LCVPs:** role LCVP, function "ICX - Incoming Exchange", office = the opportunity's host LC | All of them, always |
| 3 | **Other iGV team leads:** role TL or above (TL, ESTL, LCVP of another LC, LCP, MCVP, MCP), function ICX | Only if groups 1 and 2 gave **fewer than two** people, and only until there are two |

- **Never shown:** team members (TM), anyone with no current role, and anyone whose role is
  outside iGV. That includes national people in other areas (for example an MCVP for outgoing
  exchange or finance) and LC presidents, whose function is "President".
- **No minimum.** If nobody qualifies, there is no contact box. If only one person qualifies,
  only that one is shown. Nobody is added just to make up numbers.
- **No maximum for groups 1 and 2.** If there are three LCVPs, all three are shown.
- Each person appears once, even if they hold more than one role.

### Examples

| Managers on the opportunity (current roles) | Shown |
|---|---|
| MCVP iGV, 3 host LCVPs, 2 TLs | MCVP + the 3 LCVPs (already 2 or more, so no TLs) |
| MCVP of another area (e.g. OGX), 1 host LCVP, 2 TLs | The LCVP + the first TL (the MCVP isn't in iGV) |
| 1 host LCVP, 2 TLs | The LCVP + the first TL |
| No LCVP, 3 TLs | The first 2 TLs |
| MCVP iGV only | The MCVP (nobody else qualifies, so no filling) |
| Only team members, or people with no current role | Nobody, so no contact box |

## What is shown for each person

Only what EXPA has. A missing detail is left out, not shown as blank.

| Detail | EXPA field | Notes |
|---|---|---|
| Name | `full_name` | Required; a manager with no name is skipped |
| Job title | position `title` | e.g. "LCVP iGV B2B"; falls back to the role, e.g. "LCVP" |
| Phone | `contact_detail.phone` + `country_code` | Shown as "+94 771234567"; a local leading 0 is dropped |
| Email | `aiesec_email` | Only `@aiesec.net` addresses |

No profile photos. EXPA mostly has a default avatar, and the old site never showed photos.

## When contacts don't appear

- **Public key:** managers can only be read with a private key. With the public one EXPA
  refuses. The site then shows every opportunity **without** contacts instead of failing
  (`fetchExpaExtras` in `lib/data/expa.ts`).
- **Sheet mode** (`DATA_SOURCE=sheet`): the old per-team contact box from the sheet is used.
- **Nobody qualifies:** no contact box (13 of 262 opportunities on 2026-11-13).

The `/contact` page is separate. It uses `lib/contact-directory.ts` and is maintained by hand.

## How host teams change who appears

Everything comes from EXPA, so changes are made there and show up within about 10 minutes:

- Add or remove someone as a **manager** of the opportunity.
- Keep their **position** (role, function, LC, dates) up to date.
- Add a **phone number** to their EXPA profile if it should be shown.

## Numbers on 2026-11-13 (262 open opportunities)

| Situation | Opportunities |
|---|---|
| 3 LCVPs | 125 |
| 2 LCVPs | 91 |
| 1 LCVP | 27 |
| 1 LCVP + 1 team lead (filled to two) | 3 |
| National (iGV) + 2 LCVPs | 2 |
| National (iGV) + 3 LCVPs | 1 |
| Nobody qualifies | 13 |

600 contacts in total; 73 have a phone, 539 an @aiesec.net email.

## Changing the rule

The roles and limits are named constants at the top of the contacts section in
`lib/data/normalize-expa.ts` (`NATIONAL_ROLES`, `TEAM_LEAD_ROLES`, `IGV_FUNCTION`,
`MIN_CONTACTS_BEFORE_FILLING`). Change them there, and update the tests and this page.
