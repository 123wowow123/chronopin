import { CompanySentimentChart } from '@/components/timeline/CompanySentiment';
import { StockPanel } from '@/components/timeline/StockPanel';
import type { CompanySentiment } from '@/lib/companySentiment';

// A company page's two graphs, side by side: how its pins and comments read
// over time, and its stock price. Each is left out when the company has none.
export function CompanyCharts({ name, ticker, sentiment, className }: { name: string; ticker: string | null; sentiment: CompanySentiment | null; className?: string }) {
  if (!ticker && !sentiment) return null;
  return (
    <div className={`grid gap-4 ${ticker && sentiment ? 'lg:grid-cols-2' : ''} ${className ?? ''}`}>
      {sentiment ? (
        <div className="floating px-4 py-3.5">
          <CompanySentimentChart name={name} sentiment={sentiment} />
        </div>
      ) : null}
      {ticker ? <StockPanel symbol={ticker} /> : null}
    </div>
  );
}
