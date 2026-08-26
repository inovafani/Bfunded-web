import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/cms/guard';
import { MEDIA_BUCKET } from '@/lib/supabase/env';
import { slugify } from '@/lib/cms/format';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024; // matches the bucket's file_size_limit
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

/**
 * POST /api/admin/media -- uploads one image and returns its public URL.
 *
 * Used by both the featured-image picker and the editor's inline image button.
 * The file name is rebuilt from the original rather than trusted: it ends up
 * in a public URL, and a descriptive, keyword-bearing filename is a small but
 * free Google Images signal.
 */
export async function POST(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 10MB — compress it first.` },
      { status: 413 },
    );
  }

  const extension = ALLOWED[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: 'Only JPG, PNG, WebP, AVIF, GIF and SVG images can be uploaded.' },
      { status: 415 },
    );
  }

  const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'image';
  const now = new Date();
  const path = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    `${base}-${crypto.randomUUID().slice(0, 8)}.${extension}`,
  ].join('/');

  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });

  if (error) {
    const missingBucket = /bucket/i.test(error.message) && /not found/i.test(error.message);
    return NextResponse.json(
      {
        error: missingBucket
          ? `The "${MEDIA_BUCKET}" storage bucket does not exist. Run supabase/schema.sql in the Supabase SQL editor.`
          : error.message,
      },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: publicUrl, path }, { status: 201 });
}
