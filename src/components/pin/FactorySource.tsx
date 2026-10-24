import type { FactoryEvidence } from '@/lib/pinFactory';

export function FactorySource({ source }: { source: FactoryEvidence }) {
  return (
    <div className="mt-1 text-xs text-muted break-words">
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-link">{source.title}</a>
      {source.publishedDate ? ` · ${source.publishedDate}` : ''}
      <blockquote className="mt-1 border-s-2 border-raised-2 ps-2">“{source.quote}”</blockquote>
    </div>
  );
}
