'use client';

import { useMemo } from 'react';
import { runSeoChecks, seoSummary, type SeoSubject } from '@/lib/cms/seo';
import { truncate } from '@/lib/cms/format';

/**
 * The sidebar: how this article will look in Google, and what is still wrong
 * with it. Recomputed on every keystroke -- all of it is pure string work, so
 * that costs nothing worth memoising beyond this one useMemo.
 */
export default function SeoPanel({
  subject,
  siteUrl,
}: {
  subject: SeoSubject;
  siteUrl: string;
}) {
  const checks = useMemo(() => runSeoChecks(subject), [subject]);
  const summary = seoSummary(checks);

  const shownTitle = subject.metaTitle.trim() || subject.title.trim() || 'Untitled article';
  const shownDescription =
    subject.metaDescription.trim() ||
    subject.excerpt.trim() ||
    'Google will pull a snippet from the page when this is empty — and it is rarely the sentence you would have chosen.';

  const host = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <>
      <section className="bfa-panel">
        <h2 className="bfa-panel-title">Google preview</h2>
        <div className="bfa-serp">
          <div className="bfa-serp-crumb">
            <span className="bfa-serp-favicon" aria-hidden="true">
              BF
            </span>
            <span>
              BFunded
              <br />
              {host} › blog › {subject.slug || '…'}
            </span>
          </div>
          <div className="bfa-serp-title">{truncate(shownTitle, 70)}</div>
          <div className="bfa-serp-desc">{truncate(shownDescription, 175)}</div>
        </div>
        <p className="bfa-hint">
          Google rewrites about a third of titles anyway, but it starts from this one.
        </p>
      </section>

      <section className="bfa-panel">
        <h2 className="bfa-panel-title">SEO checklist</h2>

        <div className="bfa-score">
          <div className="bfa-score-bar" aria-hidden="true">
            <i style={{ width: `${(summary.pass / summary.total) * 100}%` }} />
            <i style={{ width: `${(summary.warn / summary.total) * 100}%` }} />
            <i style={{ width: `${(summary.fail / summary.total) * 100}%` }} />
          </div>
          <span className="bfa-score-num">
            {summary.pass}/{summary.total}
          </span>
        </div>

        <ul className="bfa-checks">
          {checks.map((check) => (
            <li className="bfa-check" key={check.id} data-status={check.status}>
              <span className="bfa-check-dot" aria-hidden="true" />
              <div>
                <div className="bfa-check-label">{check.label}</div>
                <div className="bfa-check-detail">{check.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
