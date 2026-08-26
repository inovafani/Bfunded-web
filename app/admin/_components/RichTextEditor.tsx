'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extensions';
import { wordCount } from '@/lib/cms/format';

/**
 * The article body editor.
 *
 * It stores HTML rather than Markdown deliberately: the public blog renders the
 * body straight into the page, and the marketing routes already work that way.
 * Headings are limited to H2/H3 because the article template owns the single H1
 * -- two H1s on a page is the sort of thing that quietly costs you the ranking.
 */

type Props = {
  value: string;
  onChange: (html: string) => void;
  onUpload: (file: File) => Promise<string>;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="bfa-rte-btn"
      data-on={active ? 'true' : 'false'}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      // Keep the selection: mousedown would blur the editor before the click.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function LinkPopover({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [href, setHref] = useState(() => (editor.getAttributes('link').href as string) ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function apply() {
    const value = href.trim();
    if (!value) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      // A bare domain typed by hand becomes a relative path otherwise.
      const normalised = /^(https?:|mailto:|tel:|\/|#)/i.test(value) ? value : `https://${value}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: normalised }).run();
    }
    onClose();
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        width: '100%',
        padding: '6px 2px 2px',
      }}
    >
      <input
        ref={inputRef}
        className="bfa-input"
        style={{ padding: '7px 11px', fontSize: 13.5 }}
        value={href}
        onChange={(e) => setHref(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            apply();
          }
          if (e.key === 'Escape') onClose();
        }}
        placeholder="/blog/another-article  or  https://example.com"
        aria-label="Link URL"
      />
      <button type="button" className="bfa-btn bfa-btn-primary bfa-btn-sm" onClick={apply}>
        Link
      </button>
      <button type="button" className="bfa-btn bfa-btn-ghost bfa-btn-sm" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}

export default function RichTextEditor({ value, onChange, onUpload }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    // Required in the App Router: rendering on the server and again on the
    // client would otherwise trip a hydration mismatch.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          // Replaces the extension's defaults, which are target="_blank" and
          // rel="noopener noreferrer nofollow". nofollow on internal links
          // would stop the article passing any authority to the pages it
          // points at, which is the entire point of linking internally.
          HTMLAttributes: { rel: 'noopener' },
        },
      }),
      Image.configure({ HTMLAttributes: { loading: 'lazy' } }),
      Placeholder.configure({
        placeholder:
          'Open with the answer, then earn the rest. Use H2 for each section — Google reads them as the outline of the page.',
      }),
    ],
    content: value,
    editorProps: {
      attributes: { spellcheck: 'true' },
    },
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  });

  // Repopulate when the form loads an existing post after the editor mounted.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false });
    // Only re-run when the incoming value changes identity, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  const insertImage = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError(null);
      try {
        const url = await onUpload(file);
        editor?.chain().focus().setImage({ src: url, alt: '' }).run();
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Upload failed.');
      } finally {
        setUploading(false);
      }
    },
    [editor, onUpload],
  );

  if (!editor) {
    return <div className="bfa-rte" style={{ minHeight: 520 }} />;
  }

  const words = wordCount(editor.getText());

  return (
    <>
      <div className="bfa-rte">
        <div className="bfa-rte-bar">
          <ToolbarButton
            title="Bold"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <b>B</b>
          </ToolbarButton>
          <ToolbarButton
            title="Italic"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <i>I</i>
          </ToolbarButton>
          <ToolbarButton
            title="Strikethrough"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <s>S</s>
          </ToolbarButton>

          <span className="bfa-rte-sep" />

          <ToolbarButton
            title="Section heading (H2)"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            title="Sub-heading (H3)"
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            H3
          </ToolbarButton>

          <span className="bfa-rte-sep" />

          <ToolbarButton
            title="Bulleted list"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            •—
          </ToolbarButton>
          <ToolbarButton
            title="Numbered list"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1.
          </ToolbarButton>
          <ToolbarButton
            title="Quote"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            ❝
          </ToolbarButton>
          <ToolbarButton
            title="Code block"
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            {'</>'}
          </ToolbarButton>
          <ToolbarButton
            title="Divider"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            —
          </ToolbarButton>

          <span className="bfa-rte-sep" />

          <ToolbarButton
            title="Add or edit link"
            active={editor.isActive('link')}
            onClick={() => setLinkOpen((open) => !open)}
          >
            🔗
          </ToolbarButton>
          <ToolbarButton
            title="Remove link"
            disabled={!editor.isActive('link')}
            onClick={() => editor.chain().focus().unsetLink().run()}
          >
            ⛓︎
          </ToolbarButton>
          <ToolbarButton
            title={uploading ? 'Uploading…' : 'Insert image'}
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <span className="bfa-spin" /> : '🖼'}
          </ToolbarButton>

          <span className="bfa-rte-sep" />

          <ToolbarButton
            title="Undo"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            ↶
          </ToolbarButton>
          <ToolbarButton
            title="Redo"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            ↷
          </ToolbarButton>

          <span className="bfa-rte-count">{words.toLocaleString()} words</span>

          {linkOpen ? <LinkPopover editor={editor} onClose={() => setLinkOpen(false)} /> : null}
        </div>

        <EditorContent editor={editor} />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void insertImage(file);
        }}
      />

      {uploadError ? (
        <p className="bfa-hint" style={{ color: 'var(--danger)' }}>
          {uploadError}
        </p>
      ) : null}
    </>
  );
}
