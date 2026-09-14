'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import type { PinJson } from '@/lib/types';

const CHOICES = [
  { name: 'All', value: '' },
  { name: 'Watched', value: 'watch' },
];

// The navbar search: suggestions by title as you type, Enter to search, and a
// Watched/All choice for signed-in users.
export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { isLoggedIn } = useSession();

  const urlQuery = pathname === '/search' ? params.get('q') || '' : '';
  const urlChoice = pathname === '/search' ? params.get('f') || '' : '';
  const [text, setText] = useState(urlQuery);
  const [choice, setChoice] = useState(urlChoice);
  const [suggestions, setSuggestions] = useState<PinJson[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const requestId = useRef(0);
  const boxRef = useRef<HTMLFormElement>(null);

  // Follow the URL (back/forward, label clicks).
  const [lastUrl, setLastUrl] = useState(`${urlQuery}|${urlChoice}`);
  if (lastUrl !== `${urlQuery}|${urlChoice}`) {
    setLastUrl(`${urlQuery}|${urlChoice}`);
    setText(urlQuery);
    setChoice(urlChoice);
  }

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function submit(query: string, filter = choice) {
    setOpen(false);
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (filter) next.set('f', filter);
    router.push(`/search?${next.toString()}`);
  }

  async function suggest(value: string) {
    setText(value);
    setActive(-1);
    const id = ++requestId.current;
    if (!value.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    try {
      const res = await api.get<{ pins: PinJson[] }>(`/api/pins/autocomplete?q=${encodeURIComponent(value)}`);
      if (id === requestId.current) {
        setSuggestions(res.pins || []);
        setOpen((res.pins || []).length > 0);
      }
    } catch {
      // suggestions are optional
    }
  }

  return (
    <form
      ref={boxRef}
      role="search"
      className="relative flex w-full max-w-xl min-w-0 items-stretch gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(active >= 0 ? suggestions[active].title : text);
      }}
    >
      <label htmlFor="site-search" className="sr-only">
        Search pins
      </label>
      <div className="relative flex min-w-0 flex-1 items-center rounded-full bg-field text-muted ring-1 ring-line transition-shadow ring-inset focus-within:ring-2 focus-within:ring-link">
        <Icon name="search" className="ml-3 size-4 shrink-0 text-subtle" />
        <input
          id="site-search"
          type="search"
          name="q"
          autoComplete="off"
          placeholder="Search pins"
          value={text}
          onChange={(event) => suggest(event.target.value)}
          onFocus={() => setOpen(suggestions.length > 0 && !!text)}
          onKeyDown={(event) => {
            if (!open) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((i) => Math.max(i - 1, -1));
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm text-ink placeholder:text-faint focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-suggestions"
        />
        {text ? (
          <button
            type="button"
            className="mr-1.5 rounded-full p-1.5 text-subtle hover:bg-raised hover:text-ink"
            aria-label="Clear search"
            onClick={() => {
              setText('');
              setSuggestions([]);
              router.push('/');
            }}
          >
            <Icon name="close" className="size-3.5" />
          </button>
        ) : null}
      </div>

      {isLoggedIn ? (
        <select
          aria-label="Search in"
          className="shrink-0 rounded-full bg-raised px-3 text-sm text-ink ring-1 ring-line ring-inset hover:bg-raised-2 max-sm:hidden"
          value={choice}
          onChange={(event) => {
            setChoice(event.target.value);
            submit(text, event.target.value);
          }}
        >
          {CHOICES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.name}
            </option>
          ))}
        </select>
      ) : null}

      {open ? (
        <ul
          id="search-suggestions"
          role="listbox"
          className="floating absolute top-full right-0 left-0 z-50 mt-2 max-h-96 overflow-auto p-1.5"
        >
          {suggestions.map((pin, index) => (
            <li
              key={pin.id}
              role="option"
              aria-selected={index === active}
              className={`flex cursor-pointer items-center gap-2.5 truncate rounded-lg px-3 py-2 text-sm text-ink ${index === active ? 'bg-raised' : ''}`}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                setText(pin.title);
                submit(pin.title);
              }}
            >
              <Icon name="search" className="size-3.5 shrink-0 text-faint" />
              <span className="truncate">{pin.title}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
