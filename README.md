# QIBING Transport Association – Passenger Lists

Web app for Queue Marshals to register drivers, vehicles and passengers and print the association's passenger list.

**Status: Milestone 1 of 4** – database, first-run setup, sign-in, accounts and the printed form (pages 1 and 2 with page numbers). Starting and filling lists on the phone arrives in Milestone 2.

## What works now

| Area | What you can do |
| --- | --- |
| First-run setup | Setup code → admin account → association details → letterhead logo, watermark and paper size → committee → route and limits → summary. Signs you in and opens the dashboard. Refuses to run once an admin exists. |
| Sign-in | Username + PIN (marshals) or password (admin). 5 wrong tries lock the account for 15 minutes. Sessions last 12 hours. Deactivated accounts are refused. |
| My Account | Change your own PIN/password (current one required). |
| Admin › Marshals | Create marshals with a permanent PIN set by the office, deactivate, reactivate, reset PIN, unlock. |
| Admin › Dashboard | Today's real figures (all 0 until lists exist) and the last 10 audit entries. |
| Passenger lists | Marshals and the office (admin › Passenger lists) start a list (route, vehicle, driver; new vehicles and drivers can be added on the spot), add any number of adults and up to the child limit of children, remove them, close the list and print it. Names already registered are suggested while typing. Marshals see their own lists and always start today's; the office sees every list, may pick the date and can reopen a closed list with a reason. Online only: offline sync is not built yet. |
| Blank forms | Print 1–50 blank passenger lists with your letterhead, for handwriting. One page per form; numbering runs across the job. |
| Dashboards | Marshals land on their own dashboard: today's figures, lists that need attention (no driver yet, or left open from an earlier day) and how full each list is. The office has **Marshal progress**: every queue marshal's lists for a chosen day, with totals and last activity. |
| List printouts | `/print/trip/<id>` and `/print/batch?ids=a,b` print real lists. Closed lists reprint from the snapshot taken at closing. |

## Setup

### 1. Supabase project
1. Create a project at supabase.com (region: closest to South Africa, e.g. `eu-west` or `af-south` when available).
2. **Authentication › Providers › Email**: keep Email enabled, turn **off** "Confirm email" and turn **off** "Allow new users to sign up". (The app creates every account itself.)
3. **Authentication › Sessions**: if your plan allows it, set "Time-box user sessions" to 12 hours. The app also enforces 12 hours itself.

### 2. Run the migrations
With the Supabase CLI:
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```
Or paste the files in `supabase/migrations/` into the SQL editor, in name order. They create tables, indexes, policies, audit triggers, functions and two storage buckets. The only data they insert is the list of 508 South African towns (`sa_towns`); setup then adds a route from the association's town to each of them. A marshal or the office can add a route to any other town while starting a list: type the town and tap **+ Add a route to …** (this calls `add_route_to_town()`).

### 3. Environment variables
Copy `.env.example` to `.env.local` (and add the same values in Vercel › Settings › Environment Variables):

| Name | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase › Project Settings › API › Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page, `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page, `service_role` key. Server only, never share it. |
| `SETUP_CODE` | Any long secret you choose (e.g. 20+ random characters). Needed once, for first-run setup. |
| `INTERNAL_EMAIL_DOMAIN` | Optional. Domain for the internal sign-in addresses. Default `users.qibing.internal`. Never change it after accounts exist. |

### 4. Run locally / deploy
```bash
npm install
npm run dev          # http://localhost:3000
```
Deploy: import the folder into Vercel (framework: Next.js), add the environment variables, deploy. Vercel serves HTTPS only.

### 5. First run
Open the site. It goes to **/setup**. Enter the `SETUP_CODE`, then follow the steps. The association details and committee are prefilled from the paper form; check them, upload the logo, and finish.

## Testing the database rules
`supabase/tests/rls_test.sql` checks setup-only-once, lockout, masked ID numbers for marshals, list limits, no duplicate offline sync, closing/reopening, marshals not seeing each other's lists, the audit log being unchangeable, and deactivated users losing access. It runs in a **throwaway** local PostgreSQL database and rolls everything back:
```bash
createdb qibing_test
psql -d qibing_test -f supabase/tests/supabase_stub.sql
for f in supabase/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -d qibing_test -f "$f"; done
psql -v ON_ERROR_STOP=1 -d qibing_test -f supabase/tests/rls_test.sql   # prints ALL RLS TESTS PASSED
dropdb qibing_test
```

## Backups
Supabase takes daily backups on paid plans (Project Settings › Database › Backups). On the free plan, export weekly with `supabase db dump -f backup.sql` and keep the file somewhere safe; it contains personal information (POPIA).

## Decisions (defaults chosen where the brief was silent or differed from the original form)
The printout is matched to the original Word form (NEW LIST 36.docx): positions, column widths (4020/2095/1939/1590/1146 twips), fonts (Calibri for the body, Verdana for the address, Times New Roman for the small name and REG. NO.) and sizes.
1. **Paper size is a setting.** The original is **US Letter**, so that is the default. Choose A4 in setup if your printer uses A4; the same layout is then centred on the A4 sheet.
2. **Two images.** The letterhead uses the seal photo with the green banners; the watermark is the full logo with "QIBING TRANSPORT ASS" around the top, faded. Setup asks for both (the watermark is optional and falls back to the letterhead logo). Ready-made files cut from your Word form are supplied with this build.
3. **28 passenger rows, as on the original form.** The brief said 29; the printed copy has 28, so each sheet has 28 rows. There is no adult limit: a list with more adults continues on extra sheets.
4. **The watermark prints on both pages without a border,** as on the printed copy.
5. **One page per list.** The second page of the paper form is not printed. The management committee is kept in settings but not printed.
6. **Logo bucket is public-read.** The sign-in page shows the logo before anyone signs in. The images hold no personal data; only admins can upload. Driver photos are in a separate private bucket.
7. **Every list is always exactly 1 sheet.** Rows have fixed heights and long text shrinks (9 → 7.5 → 6 pt, then wraps at 5 pt) so a list can never overflow. Page numbers are computed in code (list *n* = page *n*), which works in every browser including Chrome on Android.
8. **Blank forms** print lines for handwriting where values go, as on the paper form.
9. **Contact line** prints as "Contact " + chairperson line + " and " + secretary line, both editable.
10. **Owner title** (Mr/Mrs/Ms/none) is chosen per vehicle; with "none", no title prints.
11. **Town spelling:** the brief says "Wepener"; the Word letterhead says "Wepner". Setup is prefilled with "Wepener"; change it there if you want the paper spelling.
12. **Lockout counter** resets to 0 when a lock starts, so after 15 minutes the person has 5 new tries.
13. **Sign-out** is logged in the audit log too.
14. **Draft lists** print a small "DRAFT" box in the top-right corner; closed lists do not.
15. **Image files are never overwritten.** Each upload gets a new file name, so closed lists keep the images they were printed with.
16. **Admin landing in Milestone 1** shows today's figures only; the date filter and charts come in Milestone 3.

## Checklist (Part 1 rules)
- [x] Rule 1 – No mock data: migrations insert nothing; no seed files; the only test data is created at run time in a throwaway database and rolled back.
- [x] Rule 2 – No placeholders: no lorem ipsum, TODO/FIXME, stub functions or dummy buttons. Menus show only screens that exist in this milestone.
- [x] Rule 3 – Empty states on Today's Lists, Marshals and Recent activity; dashboard cards show 0.
- [x] Rule 4 – Association details are only used to prefill setup (`src/lib/setup-defaults.ts`); every screen and printout reads them from the database.
- [x] Rule 5 – Input hints show formats only.
- [x] Rule 6 – Defaults listed above.
- [x] Rule 7 – Form wording kept exactly: "Queue Marshall", "Under 3yrs Old Children's", "QIBING TRANSPORT ASS", "Drivers signature".

Not in this milestone: marshal list entry with offline sync and the PWA (Milestone 2); admin lists, passengers, drivers, vehicles, routes, reports, audit log screen, settings editing, Download PDF button (Milestone 3); automated app tests (Milestone 4). Until Milestone 3, settings can be changed in the Supabase table editor (`association_settings`, `committee_members`).
