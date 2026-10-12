# BFunded — unified Next.js site

Three previously separate branch deploys served as one Next.js 15 App Router
app, deployed on Vercel.

| Route     | Reproduces                                            |
| --------- | ----------------------------------------------------- |
| `/`       | `home--bfunded-invest-mix.netlify.app` (Webflow)       |
| `/about`  | `public/contoh/about.html` (newer than the live deploy)                |
| `/engine` | `public/contoh/engine.html` (newer than the live deploy)   |
| `/invest` | `investor-v2--bfunded-invest-mix.netlify.app/?v=new`   |

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
```

## Approach: verbatim reproduction

Each route renders its original page **exactly as published** — the same markup,
the same `<style>` blocks, the same inline `<script>` tags — injected as
server-rendered HTML by `components/RawPage.tsx`. Nothing was rewritten as
Tailwind components.

This matters for two reasons:

1. Because the markup is server-rendered into the initial document (rather than
   assigned via `innerHTML` on the client), the browser parses and runs those
   inline scripts normally. `DOMContentLoaded` handlers, the Webflow sliders,
   tabs, testimonial carousel and the `/invest` calculator all behave exactly as
   they do on the originals — no reimplementation to drift out of sync.
2. Each page keeps its own navbar, footer, fonts and palette, because the three
   originals never shared a design system.

The captured sources live in `public/contoh/` -- they are the reference every
route is generated from, so keep them. Being under `public/` means they are also
served, so `robots.ts` disallows `/contoh/` to keep duplicate copies out of
search results. `app/_content/*.json` holds the extracted body markup that each page
renders; regenerate those from `public/contoh/` if the originals change.

### Verified fidelity

Each route was rendered in headless Chrome at 1440px and compared pixel-by-pixel
against the original, with animations frozen on both sides (scroll reveals
forced visible, marquee/carousel transforms pinned, videos paused at frame 0):

| Route     | Page height | Differing pixels |
| --------- | ----------- | ---------------- |
| `/`       | 10550 px    | **0.0000%**      |
| `/about`  | 11784 px    | **0.0000%**      |
| `/engine` | 5466 px     | **0.0000%**      |
| `/invest` | 17028 px    | 0.0052%          |

Page heights match exactly. The remaining fractions of a percent are the native
`<video>` control bar's buffering indicator and lazy-load timing, which differ
between any two captures of the *same* page.

All images load on every route (0 broken, 0 network failures), the `/invest` video
reaches `readyState 4`, and the browser console is clean on every route. The
only 404 is `/favicon.ico` on `/about` and `/invest` -- the originals have no
favicon either, so they 404 identically.

### Two traps worth knowing about

**Hydration must be suppressed on the injected subtree.** The captured pages'
scripts mutate the DOM before React hydrates (Webflow rewrites nodes and stamps
`w-mod-*` classes on `<html>`; sliders set inline styles). React read that as a
mismatch and re-created the subtree, wiping out everything the scripts had done
and forcing every image to reload. `suppressHydrationWarning` on both the
`<html>` element and the `RawPage` wrapper is load-bearing -- removing it
visibly breaks `/`.

**The originals reference local assets, not just the CDN.** `/`'s showcase
slider loads `assets/phone-01..03.png` from the original deploy's own server,
not from Webflow's CDN. These are in `public/assets/`. When re-capturing the
originals, check for relative asset paths -- a pixel diff against a locally
served copy will *not* catch a missing one, because both sides break the same
way.

### Deliberate deviations

- **The home waitlist form.** It posts to `/api/waitlist` -- see
  [The waitlist form](#the-waitlist-form) below.
- **Root layout is bare** and Tailwind's preflight is disabled, so no reset can
  alter the reproduced pages.

## Internal links

The captured pages link to `https://www.bfunded.io/` and `https://bfunded.io/engine`
as absolute URLs, which would walk a visitor out of this app (and break entirely
on a preview domain). Five such links -- whose targets are routes that
exist here -- were repointed at the local route and had `target="_blank"`
removed:

- `/` : 3x "The Engine" (desktop nav, mobile nav, footer) -> `/engine`
- `/about` : logo -> `/`
- `/engine` : logo -> `/`

Every other outbound link is left untouched, because those pages
(`/raise`, `/the-team`, `/terms-condition`, `/privacy-policy`, WeFunder, LinkedIn)
do not exist in this app. Note that **nothing currently links to `/about`** -- no
captured page has a link to it.

## Navigation between routes

Internal links are plain `<a>` tags, so moving between routes is a full page
load. That is deliberate: it guarantees one page's global CSS never coexists
with another's.

## Assets

`/about` and `/invest` are fully self-hosted from `public/` (~8 MB). `/` keeps
Webflow's CDN for its images, hero video and JS runtime — exactly as the
original does — but its stylesheet is self-hosted at
`public/css/webflow-shared.css` so the layout survives if the Webflow site is
ever unpublished.

## The waitlist form

Lives on `/` ("Join the Network"). A Founder/Investor toggle swaps which half of
the form is shown:

| Role     | Fields collected                 |
| -------- | -------------------------------- |
| Founder  | `name` `email` `company` `url`   |
| Investor | `name` `email` `firm` `focus`    |

Plus `role`, a `source` (the page path) and a hidden `bot-field` honeypot.

Two bugs in the design file's own submit script would have lost submissions
silently: it posted to `/` (which just returns the prerendered page), and its
`.catch()` showed the thank-you message too, so a failed submission looked
successful. The handler now posts to `/api/waitlist` and shows an error, with a
fallback email address, when that fails.

### Where submissions go

`app/api/waitlist/route.ts` validates the form, drops honeypot hits, then does
two things in parallel:

1. **Supabase** -- inserts a row into `waitlist_submissions` (system of record,
   with IP, user agent and referrer). View and export CSV from the Supabase
   Table Editor. The table is in `supabase/schema.sql`; RLS is on with no
   policies, so only the server (service-role key) can touch it.
2. **Google Apps Script** (optional) -- appends a row to a Google Sheet *and*
   emails `ac@bfunded.io`. Set `NEXT_PUBLIC_SHEETS_ENDPOINT` to the script's
   `/exec` URL. The request is made server-side, so the URL is not exposed in
   the page.

The visitor sees success if **either** copy was saved; the error state appears
only when both failed (the lead would otherwise be lost). Failures are logged --
see Vercel -> Logs.

### Setting up the Google Sheet script

See `docs/google-apps-script.gs`. Create a Sheet, paste the script, deploy as a
Web app with access **"Anyone"**. Three things silently break this:

1. **Pasting the script inside `function myFunction() { ... }`.** Apps Script
   only serves a web app through a *global* `doPost`; nested one level down it
   is invisible and every request returns a Google error page. Paste at the top
   level and delete the `myFunction` stub.
2. **Not deploying a new version.** The `/exec` URL is pinned to a version.
   After any edit: Deploy -> Manage deployments -> pencil -> Version: **New
   version** -> Deploy. Saving alone changes nothing.
3. **A standalone script instead of a Sheet-bound one.**
   `SpreadsheetApp.getActiveSpreadsheet()` returns null outside a bound script,
   so set `SPREADSHEET_ID` in the script if you created it from
   script.google.com rather than from the Sheet's Extensions menu.

To verify, open the `/exec` URL in a browser -- the script answers `doGet` with
`{"ok":true,...}`. A login page or "Access Denied" means access is not set to
"Anyone" (*"Anyone with Google Account" is not enough*).

**Repairing the Sheet after a script upgrade.** `sheet_()` only writes headers
into an empty sheet, so a sheet that already has rows keeps whatever header row
it started with. Run `repairSheet()` once from the Apps Script editor: it
classifies each existing row by which column holds Founder/Investor, remaps
old-layout rows into the current column order, and rewrites the header.

### Regenerating after a design change

New captures from the design go into `public/contoh/home-new-3.html`. Then:

```bash
python3 scripts/regen-home.py
```

That rebuilds `app/_content/home.html`, keeping the design byte-for-byte except
for the things it must change (asset paths, the missing error state, nav and
footer links, mobile fixes and the submit handler). It refuses to write if a
referenced asset is missing, if the success message moved, if the submit handler
is no longer recognisable, or if it would emit a malformed closing tag -- each of
which has bitten this page before.

## Deployment

Vercel, straight from the GitHub repo -- the Next.js preset needs no config
beyond `vercel.json`, which only sets headers (long cache for `/video` and
`/assets`; `noindex` for `/admin` and `/api`).

Environment variables (Project Settings -> Environment Variables; `NEXT_PUBLIC_*`
values are compiled into the build, so **redeploy after changing them**):

| Variable                        | Purpose                                              |
| ------------------------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Blog CMS and waitlist storage                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public reads (published posts)                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server-only: CMS writes and waitlist inserts         |
| `NEXT_PUBLIC_SHEETS_ENDPOINT`   | Optional: Google Apps Script `/exec` URL             |
| `NEXT_PUBLIC_SITE_URL`          | Optional: defaults to `https://bfunded.io`           |

`NEXT_PUBLIC_SITE_URL` drives `metadataBase`, canonicals, OG image URLs and the
sitemap.

`/invest` is `noindex, nofollow` and excluded from the sitemap, matching the
original.
