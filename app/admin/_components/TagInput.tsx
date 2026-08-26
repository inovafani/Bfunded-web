'use client';

import { useState } from 'react';

/**
 * Free-text keyword labels. Enter or comma commits; Backspace on an empty
 * field removes the last one, which is the behaviour people expect from every
 * other chip input.
 */
export default function TagInput({
  value,
  onChange,
  placeholder = 'Type a tag, press Enter…',
  suggestions = [],
  max = 20,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  max?: number;
}) {
  const [draft, setDraft] = useState('');

  function add(raw: string) {
    const tag = raw.trim().replace(/,+$/, '').slice(0, 60);
    if (!tag) return;
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setDraft('');
      return;
    }
    if (value.length >= max) return;
    onChange([...value, tag]);
    setDraft('');
  }

  const unused = suggestions.filter(
    (s) => !value.some((t) => t.toLowerCase() === s.toLowerCase()),
  );

  return (
    <>
      {value.length > 0 ? (
        <div className="bfa-chips" style={{ marginBottom: 10 }}>
          {value.map((tag) => (
            <span className="bfa-chip" data-on="true" key={tag}>
              {tag}
              <button
                type="button"
                className="bfa-chip-x"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <input
        className="bfa-input"
        value={draft}
        placeholder={value.length >= max ? `Maximum ${max} tags` : placeholder}
        disabled={value.length >= max}
        onChange={(e) => {
          if (e.target.value.includes(',')) add(e.target.value);
          else setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(draft);
          }
          if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
      />

      {unused.length > 0 ? (
        <div className="bfa-chips bfa-taginput">
          {unused.slice(0, 12).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="bfa-chip"
              onClick={() => add(suggestion)}
            >
              + {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
