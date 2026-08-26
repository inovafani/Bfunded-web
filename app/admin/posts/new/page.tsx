import { loadEditorContext } from '@/lib/cms/admin-data';
import AdminChrome from '../../_components/AdminChrome';
import PostEditor from '../../_components/PostEditor';

export const dynamic = 'force-dynamic';

export default async function NewPostPage() {
  const context = await loadEditorContext();

  return (
    <AdminChrome current="posts">
      <PostEditor post={null} {...context} />
    </AdminChrome>
  );
}
