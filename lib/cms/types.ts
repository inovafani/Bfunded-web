/** Shapes shared by the admin UI, the API routes and the public blog pages. */

export type PostStatus = 'draft' | 'published';
export type SchemaType = 'Article' | 'FAQPage' | 'HowTo';

export type FaqItem = { question: string; answer: string };

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  meta_description: string | null;
  sort_order: number;
  created_at: string;
};

export type Post = {
  id: string;

  title: string;
  slug: string;
  author: string;
  category_id: string | null;
  tags: string[];

  body_html: string;
  body_text: string;
  excerpt: string | null;
  reading_minutes: number;

  cover_url: string | null;
  cover_alt: string | null;

  meta_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  canonical_url: string | null;
  schema_type: SchemaType;
  faq: FaqItem[];
  noindex: boolean;

  og_title: string | null;
  og_description: string | null;
  og_url: string | null;

  related_ids: string[];

  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

/** A post joined to its category, which is what every page actually renders. */
export type PostWithCategory = Post & { category: Category | null };

/** The subset the index/listing pages need -- keeps the payload small. */
export type PostCard = Pick<
  Post,
  | 'id'
  | 'title'
  | 'slug'
  | 'author'
  | 'excerpt'
  | 'cover_url'
  | 'cover_alt'
  | 'reading_minutes'
  | 'published_at'
  | 'tags'
> & { category: Pick<Category, 'name' | 'slug'> | null };

/** Everything the editor form can send. `id` is absent when creating. */
export type PostInput = Omit<
  Post,
  'id' | 'created_at' | 'updated_at' | 'body_text' | 'reading_minutes'
>;

/** Articles per page on /blog and each category archive. */
export const POSTS_PER_PAGE = 12;

/** Recommended character budgets, enforced as soft warnings in the editor. */
export const LIMITS = {
  metaTitle: 60,
  metaDescription: 160,
  ogTitle: 70,
  ogDescription: 200,
  excerpt: 240,
} as const;

export const SCHEMA_TYPES: { value: SchemaType; label: string; hint: string }[] = [
  { value: 'Article', label: 'Article', hint: 'Default — use for every normal post' },
  { value: 'FAQPage', label: 'FAQ Page', hint: 'Posts built around question/answer pairs' },
  { value: 'HowTo', label: 'How-To', hint: 'Step-by-step guides' },
];
