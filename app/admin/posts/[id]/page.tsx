import { notFound } from 'next/navigation';
import { loadEditorContext, loadPost } from '@/lib/cms/admin-data';
import AdminChrome from '../../_components/AdminChrome';
import PostEditor from '../../_components/PostEditor';

export const dynamic = 'force-dynamic';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, context] = await Promise.all([loadPost(id), loadEditorContext()]);

  if (!post) notFound();

  return (
    <AdminChrome current="posts">
      <PostEditor post={post} {...context} />
    </AdminChrome>
  );
}
