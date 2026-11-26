'use client';

import { useId, useState } from 'react';
import { AuthLink } from '@/components/nav/AuthLink';
import { Icon } from '@/components/ui/Icon';
import Link from '@/components/ui/Link';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { addOwnTickers, removeOwnTicker, useOwnTickers } from '@/lib/client/ownTickers';
import { useSession } from '@/lib/client/session';
import { MAX_OWN_TICKERS, parseTickerInput } from '@/lib/ownTickers';
import { term } from '@/lib/searchTerms';

// The trades pages' "add your own ticker" box, with the tickers added so far.
// A symbol is kept only when the price source knows it.
export function OwnTickers({ className = '' }: { className?: string }) {
  const t = useT();
  const tickers = useOwnTickers();
  const { status, isLoggedIn } = useSession();
  // Alerts read the account's list, so a visitor is offered signing in.
  const offerSignIn = status === 'ready' && !isLoggedIn && tickers.length > 0;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const { symbols, invalid } = parseTickerInput(text);
    const fresh = symbols.filter((s) => !tickers.includes(s));
    if (invalid) return setError(t('notifications.ownTickerInvalid'));
    if (tickers.length + fresh.length > MAX_OWN_TICKERS) return setError(t('notifications.ownTickerLimit', { count: MAX_OWN_TICKERS }));
    setError(null);
    if (!fresh.length) return setText('');
    setBusy(true);
    try {
      const { unchecked } = await api.get<{ unchecked: string[] }>(`/api/trades/high-volume?days=1&symbols=${encodeURIComponent(fresh.join(','))}`);
      const known = fresh.filter((s) => !unchecked.includes(s));
      if (known.length) await addOwnTickers(known);
      // What was not found stays in the box to be corrected.
      setText(unchecked.join(' '));
      if (unchecked.length) setError(t('notifications.ownTickerUnknown', { symbols: unchecked.join(', ') }));
    } catch {
      setError(t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
        {tickers.length ? (
          <ul aria-label={t('notifications.ownTickers')} className="flex flex-wrap items-center justify-end gap-1.5">
            {tickers.map((symbol) => (
              <li key={symbol} className="flex items-center rounded-full bg-own-ticker/15 text-xs font-semibold text-own-ticker ring-1 ring-own-ticker/40 ring-inset">
                <Link href={`/search?q=${encodeURIComponent(term('ticker', symbol))}`} className="py-1 ps-2.5 pe-0.5 text-own-ticker hover:underline">{symbol}</Link>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    removeOwnTicker(symbol).catch(() => setError(t('common.somethingWrong')));
                  }}
                  aria-label={t('notifications.ownTickerRemove', { symbol })}
                  title={t('notifications.ownTickerRemove', { symbol })}
                  className="me-0.5 rounded-full p-1 hover:bg-own-ticker/20"
                >
                  <Icon name="close" className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <form onSubmit={submit} className="flex items-center gap-1.5">
          <input
            type="text"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setError(null);
            }}
            placeholder={t('notifications.ownTickerPlaceholder')}
            aria-label={t('notifications.ownTickerPlaceholder')}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={120}
            className="w-44 rounded-lg bg-field px-3 py-1.5 text-sm text-ink ring-1 ring-line ring-inset placeholder:text-subtle focus:ring-2 focus:ring-link focus:outline-none"
          />
          <button type="submit" disabled={busy || !text.trim()} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50">
            {busy ? t('common.loading') : t('notifications.ownTickerAdd')}
          </button>
        </form>
      </div>
      {/* Hung under the box, so it never moves the title beside it. */}
      {error ? (
        <p id={errorId} role="alert" className="absolute end-0 top-full mt-0.5 text-xs whitespace-nowrap text-danger-soft">{error}</p>
      ) : offerSignIn ? (
        <AuthLink to="/login" className="absolute end-0 top-full mt-0.5 text-xs whitespace-nowrap text-link hover:underline">{t('notifications.ownTickerSignIn')}</AuthLink>
      ) : null}
    </div>
  );
}
