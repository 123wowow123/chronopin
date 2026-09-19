'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

type WikiPage = { id: number; type: string; title: string; summary: string; body: string; tags: string[]; children: WikiPage[] };
type SourceRow = {
  id: number;
  url: string;
  kind: string;
  role: string;
  title: string | null;
  status: string;
  attempts: number;
  lastError: string | null;
  wikiVersion: number;
  summarizedWikiVersion: number | null;
  removed: boolean;
  wiki: WikiPage | null;
};
type SourceView = { summaryStale: boolean; lintFindings: { check?: string; message?: string; severity?: string }[]; sources: SourceRow[] };

function Page({ page, depth }: { page: WikiPage; depth: number }) {
  return (
    <details className={depth ? 'ml-4 mt-2' : 'mt-2'}>
      <summary className="cursor-pointer text-sm text-ink">
        {page.title} <span className="text-xs text-subtle">{page.type}</span>
      </summary>
      <div className="mt-1 space-y-1 border-l border-line pl-3">
        {page.summary && <p className="text-sm text-muted">{page.summary}</p>}
        {page.tags.length > 0 && <p className="text-xs text-subtle">{page.tags.join(', ')}</p>}
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-muted">{page.body}</pre>
        {page.children.map((child) => (
          <Page key={child.id} page={child} depth={depth + 1} />
        ))}
      </div>
    </details>
  );
}

// Admin only: the OKF wikis, one per link, that the pin's long-form summary
// is built from (GET /api/pins/:id/sources).
export function PinSourceWikis({ pinId }: { pinId: number }) {
  const [view, setView] = useState<SourceView | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    api
      .get<SourceView>(`/api/pins/${pinId}/sources`)
      .then((data) => live && setView(data))
      .catch((e) => live && setError(e instanceof ApiError ? e.message : 'Could not load the wikis'));
    return () => {
      live = false;
    };
  }, [pinId]);

  return (
    <details className="surface-privileged p-4">
      <summary className="cursor-pointer text-sm font-medium text-muted hover:text-ink">
        OKF wikis behind this pin (admin){view ? ` · ${view.sources.length}` : ''}
      </summary>
      <div className="mt-3 space-y-3">
        {error && <p className="text-sm text-danger">{error}</p>}
        {!view && !error && <p className="text-sm text-subtle">Loading…</p>}
        {view && (
          <>
            {view.summaryStale && <p className="text-sm text-danger">The summary is older than its wikis.</p>}
            {view.sources.length === 0 && <p className="text-sm text-subtle">No links have been turned into wikis.</p>}
            {view.sources.map((source) => (
              <div key={source.id} className="rounded-lg border border-line p-3">
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-link">
                  {source.title || source.url}
                </a>
                <p className="text-xs text-subtle">
                  {source.kind} · {source.role} · {source.status}
                  {source.attempts ? ` · ${source.attempts} tries` : ''} · wiki v{source.wikiVersion}
                  {source.summarizedWikiVersion != null && source.summarizedWikiVersion !== source.wikiVersion ? ` (summary used v${source.summarizedWikiVersion})` : ''}
                  {source.removed ? ' · link removed' : ''}
                </p>
                {source.lastError && <p className="text-xs text-danger">{source.lastError}</p>}
                {source.wiki ? <Page page={source.wiki} depth={0} /> : <p className="mt-1 text-xs text-subtle">No wiki yet.</p>}
              </div>
            ))}
            {view.lintFindings.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted">Lint findings</p>
                <ul className="list-disc pl-5 text-xs text-muted">
                  {view.lintFindings.map((finding, i) => (
                    <li key={i}>{[finding.check, finding.message].filter(Boolean).join(': ') || JSON.stringify(finding)}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}
