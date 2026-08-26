-- ============================================================================
-- BFunded Blog CMS -- Supabase schema
-- ============================================================================
-- Run this ONCE in the Supabase dashboard: SQL Editor -> New query -> paste
-- -> Run. It is idempotent, so re-running it after a pull is safe.
--
-- After running it, finish the two manual steps in docs/cms-setup.md:
--   1. Storage: the `blog-media` bucket is created below, but confirm it is
--      marked public so <img> tags can load without signed URLs.
--   2. Auth: create the admin user under Authentication -> Users -> Add user.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
-- Categories are a real table (not a text column) because every category gets
-- its own indexable archive page at /blog/category/<slug>. Those archives are
-- part of the SEO surface, so they need a stable slug, their own title and
-- their own meta description.
create table if not exists public.categories (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  description      text,
  meta_description text,
  sort_order       int  not null default 0,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id                uuid primary key default gen_random_uuid(),

  -- article
  title             text not null,
  slug              text not null unique,
  author            text not null default 'BFunded',
  category_id       uuid references public.categories(id) on delete set null,
  tags              text[] not null default '{}',

  -- content
  body_html         text not null default '',
  body_text         text not null default '',   -- tag-stripped copy, used for
                                                -- word count and search
  excerpt           text,
  reading_minutes   int  not null default 1,

  -- featured image
  cover_url         text,
  cover_alt         text,

  -- seo
  meta_title        text,
  meta_description  text,
  focus_keyword     text,
  canonical_url     text,
  schema_type       text not null default 'Article'
                      check (schema_type in ('Article', 'FAQPage', 'HowTo')),
  faq               jsonb not null default '[]'::jsonb,  -- [{question, answer}]
  noindex           boolean not null default false,

  -- social share
  og_title          text,
  og_description    text,
  og_url            text,

  -- internal linking: hand-picked related articles, shown under the post
  related_ids       uuid[] not null default '{}',

  -- publishing
  status            text not null default 'draft'
                      check (status in ('draft', 'published')),
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists posts_status_published_idx
  on public.posts (status, published_at desc);
create index if not exists posts_category_idx on public.posts (category_id);
create index if not exists posts_tags_idx on public.posts using gin (tags);

-- Keep updated_at honest: it is sent to Google as dateModified, so it must
-- reflect the real last edit rather than whatever the client happened to post.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- Anonymous visitors may read published posts and all categories, nothing else.
-- Every write goes through the Next.js route handlers using the service role
-- key, which bypasses RLS -- and those handlers check for a signed-in admin
-- first. So there is deliberately no insert/update/delete policy here.
alter table public.posts      enable row level security;
alter table public.categories enable row level security;

drop policy if exists "published posts are public" on public.posts;
create policy "published posts are public"
  on public.posts for select
  to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());

drop policy if exists "categories are public" on public.categories;
create policy "categories are public"
  on public.categories for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Storage bucket for uploaded article images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-media', 'blog-media', true, 10485760,
  array['image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "blog media is publicly readable" on storage.objects;
create policy "blog media is publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'blog-media');

-- ---------------------------------------------------------------------------
-- Starter categories
-- ---------------------------------------------------------------------------
-- Seeded to match what BFunded actually ranks for. Rename or delete them from
-- the admin UI (Categories tab) -- this only fills an empty table.
insert into public.categories (slug, name, description, sort_order) values
  ('fundraising',        'Fundraising',         'Running an early-stage raise end to end.', 1),
  ('investor-relations', 'Investor Relations',  'Finding, warming and closing investors.',  2),
  ('equity-crowdfunding','Equity Crowdfunding', 'Reg CF, Reg A+ and the retail raise.',     3),
  ('founder-playbook',   'Founder Playbook',    'What separates founders who close.',       4),
  ('product-updates',    'Product Updates',     'What is new inside BFunded.',              5)
on conflict (slug) do nothing;
