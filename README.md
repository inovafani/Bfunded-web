# BFunded — unified Next.js site

Three previously separate branch deploys served as one Next.js 15 App Router
app, ready for Netlify.

| Route     | Reproduces                                            |
| --------- | ----------------------------------------------------- |
| `/`       | `home--bfunded-invest-mix.netlify.app` (Webflow)       |
| `/about`  | `about--bfunded-invest-mix.netlify.app`                |
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

The captured sources live in `reference/` (outside `public/`, so they are not
served). `app/_content/*.json` holds the extracted body markup that each page
renders; regenerate those from `reference/` if the originals change.

### Verified fidelity

Each route was rendered in headless Chrome at 1440px and compared pixel-by-pixel
against the original, with animations frozen on both sides (scroll reveals
forced visible, marquee/carousel transforms pinned, videos paused at frame 0):

| Route     | Page height | Mean pixel diff | Differing pixels |
| --------- | ----------- | --------------- | ---------------- |
| `/`       | 10550 px    | 0.0013          | 0.0024%          |
| `/about`  | 5542 px     | 0.0024          | 0.0045%          |
| `/invest` | 17028 px    | 0.0102          | 0.0065%          |

Page heights match exactly. The remaining fractions of a percent are the native
`<video>` control bar's buffering indicator and lazy-load timing, which differ
between any two captures of the *same* page.

All 151 images on `/` load (0 broken, 0 network failures), the `/invest` video
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

- **The home waitlist form.** The original posts to Webflow's backend behind a
  Cloudflare Turnstile challenge, which only works on Webflow-hosted domains. It
  is rewired to **Netlify Forms**, keeping every class so it looks identical.
  Submissions now land in this site's Netlify dashboard, not Webflow's. A
  capture-phase handler intercepts the submit before Webflow's own handler and
  reuses Webflow's `.w-form-done` / `.w-form-fail` UI.
- **`public/__forms.html`** declares the form for Netlify's build-time parser,
  which cannot see a React-rendered form. Keep its field names in sync with the
  form in `app/_content/home.json`.
- **Root layout is bare** and Tailwind's preflight is disabled, so no reset can
  alter the reproduced pages.

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

## Deployment

`netlify.toml` targets Netlify's Next.js runtime (full SSR/ISR, no static
export):

```toml
[build]
  command = "npm run build"
  publish = ".next"
[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Set `NEXT_PUBLIC_SITE_URL` once the domain is attached; `lib/site.ts` falls back
to Netlify's build-time `URL`. It drives `metadataBase`, canonicals, OG image
URLs and the sitemap.

`/invest` is `noindex, nofollow` and excluded from the sitemap, matching the
original. After the first deploy, enable form notifications under
*Site configuration → Forms*.
