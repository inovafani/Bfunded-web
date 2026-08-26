'use client';

import type { FaqItem } from '@/lib/cms/types';

/**
 * Q&A pairs for schema_type = FAQPage.
 *
 * These are emitted as FAQPage JSON-LD *and* rendered at the bottom of the
 * article. Structured data that does not match visible content on the page is
 * a manual-action risk, so the two are never allowed to diverge.
 */
export default function FaqBuilder({
  items,
  onChange,
}: {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
}) {
  function update(index: number, patch: Partial<FaqItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <>
      {items.map((item, index) => (
        <div
          key={index}
          style={{
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: 16,
            marginBottom: 12,
          }}
        >
          <div className="bfa-label" style={{ marginBottom: 8 }}>
            Question {index + 1}
            <button
              type="button"
              className="bfa-btn bfa-btn-ghost bfa-btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
          <input
            className="bfa-input"
            value={item.question}
            onChange={(e) => update(index, { question: e.target.value })}
            placeholder="How long does a Reg CF raise actually take?"
          />
          <textarea
            className="bfa-textarea"
            style={{ marginTop: 10, minHeight: 76 }}
            value={item.answer}
            onChange={(e) => update(index, { answer: e.target.value })}
            placeholder="Answer it in two or three sentences. Plain text only — Google strips markup here."
          />
        </div>
      ))}

      <button
        type="button"
        className="bfa-btn bfa-btn-sm"
        onClick={() => onChange([...items, { question: '', answer: '' }])}
      >
        + Add a question
      </button>

      <p className="bfa-hint">
        Pairs with an empty question or answer are dropped on save. Aim for 3–6 — enough to earn the
        expandable result, few enough to stay honest.
      </p>
    </>
  );
}
