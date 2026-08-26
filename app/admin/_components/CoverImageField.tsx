'use client';

import { useRef, useState } from 'react';

/**
 * Featured image: upload, drag-and-drop, or paste a URL.
 *
 * The preview is locked to 1200×630 because that is the crop Facebook,
 * LinkedIn and X apply to og:image -- showing it at any other aspect ratio
 * hides exactly the problem the editor needs to see.
 */
export default function CoverImageField({
  url,
  onChange,
  onUpload,
}: {
  url: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      onChange(await onUpload(file));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {url ? (
        <div className="bfa-cover-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Featured image preview" />
          <div className="bfa-cover-actions">
            <button
              type="button"
              className="bfa-btn bfa-btn-sm"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              {busy ? 'Uploading…' : 'Replace'}
            </button>
            <button type="button" className="bfa-btn bfa-btn-sm" onClick={() => onChange('')}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          className="bfa-cover"
          data-drag={dragging ? 'true' : 'false'}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void upload(file);
          }}
        >
          <p style={{ marginBottom: 14 }}>
            Drop an image here, or{' '}
            <button
              type="button"
              className="bfa-btn bfa-btn-sm"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              {busy ? 'Uploading…' : 'choose a file'}
            </button>
          </p>
          <p className="bfa-hint" style={{ margin: 0 }}>
            1200 × 630 or larger. JPG, PNG, WebP or AVIF, up to 10MB.
          </p>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void upload(file);
        }}
      />

      <div style={{ marginTop: 12 }}>
        <input
          className="bfa-input"
          value={url}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder="…or paste an image URL"
          aria-label="Featured image URL"
        />
      </div>

      {error ? (
        <p className="bfa-hint" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}
    </>
  );
}
