// Looking up and filling in the app's messages, shared by server and client.
//
// A message is a string with {name} slots, or plural forms keyed by the
// Intl.PluralRules category of {count}: { one: '{count} day', other: '{count}
// days' }. Japanese and Chinese have only `other`; French also uses `many`
// for millions and falls back to `other` without it. t.rich swaps <tag>…</tag>
// spans for elements, for links and emphasis inside a sentence.

import { Fragment, createElement, type ReactNode } from 'react';
import { INTL_LOCALES, type Locale } from './config';
import type en from './messages/en';

export type PluralForms = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
type Message = string | PluralForms;
type PluralCategory = keyof PluralForms;

// A node of plural forms has only plural categories for keys; a namespace
// may happen to have an "other" key among others (categories.other).
type IsMessage<V> = V extends string ? true : V extends { other: string } ? (Exclude<keyof V, PluralCategory> extends never ? true : false) : false;

// Every language has the English tree's shape: the same keys, each a message.
type Shape<T> = { [K in keyof T]: IsMessage<T[K]> extends true ? Message : Shape<T[K]> };
export type Messages = Shape<typeof en>;

// "nav.logIn" style keys to every message in the English tree.
type Keys<T, Prefix extends string = ''> = {
  [K in keyof T & string]: IsMessage<T[K]> extends true ? `${Prefix}${K}` : Keys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];
export type MessageKey = Keys<typeof en>;

export type Values = Record<string, string | number>;
export type RichValues = Record<string, string | number | ((chunks: ReactNode) => ReactNode)>;

export type Translator = {
  (key: MessageKey, values?: Values): string;
  rich(key: MessageKey, values: RichValues): ReactNode;
  // Whether a key exists, for messages picked by data (a category's name).
  has(key: string): boolean;
  // The same lookup for a key built at run time; falls back to `fallback`.
  dynamic(key: string, fallback: string, values?: Values): string;
  locale: Locale;
};

function lookup(messages: Messages, key: string): Message | undefined {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node === 'string') return node;
  if (node && typeof node === 'object' && Object.keys(node).every((k) => PLURAL_CATEGORIES.has(k)) && typeof (node as PluralForms).other === 'string') {
    return node as PluralForms;
  }
  return undefined;
}

const PLURAL_CATEGORIES = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);
const pluralRules = new Map<Locale, Intl.PluralRules>();
const numberFormats = new Map<Locale, Intl.NumberFormat>();

function pick(message: Message, locale: Locale, values?: Values): string {
  if (typeof message === 'string') return message;
  const count = Number(values?.count ?? 0);
  let rules = pluralRules.get(locale);
  if (!rules) pluralRules.set(locale, (rules = new Intl.PluralRules(INTL_LOCALES[locale])));
  if (count === 0 && message.zero !== undefined) return message.zero;
  return message[rules.select(count)] ?? message.other;
}

// Numbers print in the language's own way ("1,234" / "1.234" / "1 234");
// {count} too, so "1,234 views" reads right everywhere.
function show(value: string | number, locale: Locale): string {
  if (typeof value !== 'number') return value;
  let format = numberFormats.get(locale);
  if (!format) numberFormats.set(locale, (format = new Intl.NumberFormat(INTL_LOCALES[locale], { maximumFractionDigits: 2 })));
  return format.format(value);
}

function fill(text: string, locale: Locale, values?: Values): string {
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? show(values[name], locale) : whole));
}

export function createTranslator(messages: Messages, locale: Locale, fallback?: Messages): Translator {
  const resolve = (key: string) => lookup(messages, key) ?? (fallback ? lookup(fallback, key) : undefined);

  const t = ((key: MessageKey, values?: Values) => {
    const message = resolve(key);
    return message === undefined ? key : fill(pick(message, locale, values), locale, values);
  }) as Translator;

  t.has = (key) => resolve(key) !== undefined;

  t.dynamic = (key, otherwise, values) => {
    const message = resolve(key);
    return message === undefined ? otherwise : fill(pick(message, locale, values), locale, values);
  };

  t.rich = (key, values) => {
    const plain: Values = {};
    for (const [name, value] of Object.entries(values)) if (typeof value !== 'function') plain[name] = value;
    const message = resolve(key);
    const text = message === undefined ? key : fill(pick(message, locale, plain), locale, plain);
    const parts: ReactNode[] = [];
    const tag = /<(\w+)>(.*?)<\/\1>/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = tag.exec(text))) {
      if (match.index > last) parts.push(text.slice(last, match.index));
      const render = values[match[1]];
      parts.push(typeof render === 'function' ? createElement(Fragment, { key: parts.length }, render(match[2])) : match[2]);
      last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return createElement(Fragment, null, ...parts);
  };

  t.locale = locale;
  return t;
}
