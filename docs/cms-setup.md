# Blog CMS — setup

The blog runs on Supabase (Postgres for the articles, Storage for the images,
Auth for the admin login). Everything else is in this repo.

Nothing here is optional except step 6. Until steps 1–5 are done, `/blog`
renders an empty state and `/admin` shows a "not connected" notice — the
marketing pages are unaffected either way.

---

## 1. Create the Supabase project

<https://supabase.com> → **New project**. Pick the region closest to your
visitors. Save the database password somewhere; you will not need it for this
setup, but you will the first time something goes wrong.

## 2. Create the tables

Dashboard → **SQL Editor** → **New query** → paste the whole of
[`supabase/schema.sql`](../supabase/schema.sql) → **Run**.

That creates the `posts` and `categories` tables, the `blog-media` storage
bucket, the row-level-security policies, and five starter categories.

It is safe to run again after pulling changes.

## 3. Copy the three keys

Dashboard → **Project Settings → API**:

| Dashboard label             | Environment variable            |
| --------------------------- | ------------------------------- |
| Project URL                 | `NEXT_PUBLIC_SUPABASE_URL`      |
| `anon` `public` key         | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY`     |

The first two are public by design — they ship to the browser and are limited
by row level security, which only ever exposes published posts.

**The third is a secret.** It bypasses every policy. Never prefix it with
`NEXT_PUBLIC_`, never commit it, and never paste it into client code. It is
used only inside `/api/admin/*` route handlers, and only after the request has
been confirmed to come from a signed-in admin.

### Locally

```bash
cp .env.example .env.local
# then uncomment and fill the three Supabase lines
npm run dev
```

### On Netlify

Site configuration → **Environment variables** → add all three → **Deploys →
Trigger deploy → Clear cache and deploy site**. The first two are baked into
the build, so a redeploy is required; changing them does not take effect on its
own.

## 4. Create the admin account

Dashboard → **Authentication → Users → Add user → Create new user**.

- Email: whoever runs the blog
- Password: set one
- **Auto Confirm User: on** (otherwise the account cannot sign in until the
  confirmation email is clicked)

Repeat for each person who needs access. There are no roles — every account can
do everything.

To turn off public sign-ups so nobody can create their own account:
**Authentication → Sign In / Providers → Email → Allow new users to sign up:
off**.

## 5. Sign in

`https://your-site/admin` → redirects to the login screen → write the first
article.

## 6. Tell Google (optional, but this is the point)

1. [Google Search Console](https://search.google.com/search-console) → add the
   property → verify the domain.
2. Submit `https://your-site/sitemap.xml`. Every published article, category
   archive and paginated index page is in it automatically.
3. After publishing something you care about, paste its URL into the **URL
   Inspection** box → **Request indexing**. It shortcuts the wait from weeks to
   roughly a day.

---

## How it fits together

```
app/admin/…              the CMS      (dynamic, noindex, behind auth)
app/blog/…               the blog     (ISR, cached on the CDN, indexable)
app/api/admin/…          write API    (service-role key, admin-only)
lib/cms/…                queries, validation, SEO checks, JSON-LD
lib/supabase/…           the three clients: browser, request, service-role
middleware.ts            refreshes the session, guards /admin and /api/admin
supabase/schema.sql      the database
```

**Who can read what.** Row level security allows anonymous `select` on
published posts and on categories, and nothing else. Drafts, scheduled posts
and every write are reachable only through the service-role key, which lives on
the server. A leaked anon key exposes what is already on the public blog.

**Caching.** Blog pages are ISR with a one-hour window, and every save calls
`revalidatePath` on the affected URLs — so an edit is live immediately, and a
scheduled post appears within the hour without anyone touching it.

**Images.** Uploads go to the `blog-media` bucket under `YYYY/MM/`, served
straight from Supabase's CDN with a one-year cache header. The filename is
rebuilt from the original as a slug, because it ends up in a public URL that
Google Images reads.

---

## Writing an article that actually ranks

The editor's right-hand panel checks all of this live. In order of what moves
the needle:

1. **One focus keyword per article.** Two articles targeting the same phrase
   compete with each other instead of with everyone else.
2. **Put it in the title, the URL and the first 100 words.** Naturally — an
   awkward sentence costs more in bounce rate than the keyword gains.
3. **900+ words, broken up with H2s.** The pages currently ranking for anything
   contested are long. The H2s are also what earn "jump to" sitelinks.
4. **Link to at least two other BFunded pages,** and link out to one credible
   source. Internal links are the mechanism by which one ranking article lifts
   the next one — which is how a search result page ends up all BFunded.
5. **Featured image with real alt text.** It is the share card on LinkedIn and
   a free Google Images entry.
6. **Meta description of 140–160 characters** that says what the reader gets.
   Google bolds the matched keyword, which lifts click-through.
7. **Use the FAQ schema type** when the article genuinely answers questions.
   Ship 3–6 pairs; they render on the page _and_ go to Google as structured
   data. Never send Google a question the page does not visibly answer.

---

## Troubleshooting

**"The database tables are missing"** — step 2 was skipped, or was run against a
different project than the keys in step 3.

**Login says the credentials are wrong, and they are not** — the user was
created without _Auto Confirm_. Delete and recreate it with that toggle on.

**An uploaded image 404s** — the `blog-media` bucket is not public. Dashboard →
Storage → `blog-media` → Settings → Public bucket → on. (Re-running
`schema.sql` also fixes this.)

**A published article is not on /blog** — its publish date is in the future.
Open it and check the Publishing panel.

**Everything works locally and nothing works on Netlify** — the environment
variables were added but the site was not redeployed. `NEXT_PUBLIC_*` values
are compiled into the build.
