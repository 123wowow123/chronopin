import { ALERT_SOON_MINUTES } from '@/lib/alerts';
import { localeOr, type Locale } from '@/lib/i18n/config';
import { createTranslator, type Messages, type Translator } from '@/lib/i18n/translate';
import { pinImage, pinPath } from '@/lib/seo';
import { toJson, type PinJson } from '@/lib/types';
import * as db from '../db';
import { emitWatchAlert, type WatchAlert } from '../events';
import Notification from '../model/notification';
import Pin from '../model/pin';
import ThreadWatch from '../model/threadWatch';
import { pushToUser } from '../push';
import log from '../util/log';

// The clock for watched-pin alerts: every CHECK_MS the server writes a
// 'start' for each watched pin that has just started (and a 'soon' 15 minutes
// ahead for those who asked, User.remindBeforeStart), then sends each one
// that was new as a browser notification - over the live feed to the
// watcher's open pages, and as a Web Push to every browser they allowed
// notifications in (src/server/push.ts). The unique index on the rows is what
// makes each go out once, however many servers or ticks see it due. A watched
// pin that is updated is sent the same way (notifyWatchersOfUpdate).

const CHECK_MS = 20 * 1000;

const g = globalThis as unknown as { __chronopinWatchAlertTimer?: ReturnType<typeof setInterval>; __chronopinWatchAlertBusy?: boolean };

// The message files themselves, not messages/index.ts: that one is
// server-only, which this timer (started from instrumentation) is not.
const loaders: Record<Locale, () => Promise<{ default: Messages }>> = {
  en: () => import('@/lib/i18n/messages/en'),
  es: () => import('@/lib/i18n/messages/es'),
  fr: () => import('@/lib/i18n/messages/fr'),
  de: () => import('@/lib/i18n/messages/de'),
  ja: () => import('@/lib/i18n/messages/ja'),
  zh: () => import('@/lib/i18n/messages/zh'),
  ko: () => import('@/lib/i18n/messages/ko'),
  hi: () => import('@/lib/i18n/messages/hi'),
  ar: () => import('@/lib/i18n/messages/ar'),
  th: () => import('@/lib/i18n/messages/th'),
  it: () => import('@/lib/i18n/messages/it'),
  ru: () => import('@/lib/i18n/messages/ru'),
  pt: () => import('@/lib/i18n/messages/pt'),
  ms: () => import('@/lib/i18n/messages/ms'),
  vi: () => import('@/lib/i18n/messages/vi'),
};

async function translatorFor(locale: Locale): Promise<Translator> {
  const [messages, en] = await Promise.all([loaders[locale](), loaders.en()]);
  return createTranslator(messages.default, locale, en.default);
}

// The language each user reads in, when they have chosen one.
async function localesOf(userIds: number[]): Promise<Map<number, Locale>> {
  const rows = await db.query(`SELECT "id", "localePreference" FROM "User" WHERE "id" = ANY($1)`, [userIds]);
  return new Map(rows.map((row) => [Number(row.id), localeOr(row.localePreference)]));
}

export async function checkWatchAlerts(now = new Date()): Promise<number> {
  if (g.__chronopinWatchAlertBusy) return 0;
  g.__chronopinWatchAlertBusy = true;
  try {
    const due = await Notification.writeDueAlerts();
    if (!due.length) return 0;

    const pinIds = [...new Set(due.map((row) => Number(row.pinId)))];
    const [pins, locales] = await Promise.all([
      Promise.all(pinIds.map((id) => Pin.queryById(id).then(({ pin }) => (pin ? toJson<PinJson>(pin) : null)))),
      localesOf([...new Set(due.map((row) => Number(row.userId)))]),
    ]);
    const pinOf = new Map(pinIds.map((id, i) => [id, pins[i]]));
    const translators = new Map<Locale, Promise<Translator>>();

    await Promise.all(
      due.map(async (row) => {
        const userId = Number(row.userId);
        const pinId = Number(row.pinId);
        const pin = pinOf.get(pinId);
        const locale = locales.get(userId) ?? 'en';
        if (!translators.has(locale)) translators.set(locale, translatorFor(locale));
        const t = await translators.get(locale)!;
        const minutes = Math.max(1, Math.round((new Date(row.start).getTime() - now.getTime()) / 60000));
        const alert: WatchAlert = {
          userId,
          pinId,
          type: row.type,
          title: pin?.title ?? row.title,
          body: row.type === 'soon' ? t('alerts.soon', { count: Math.min(minutes, ALERT_SOON_MINUTES) }) : t('alerts.start'),
          url: pinPath({ id: pinId, title: pin?.title ?? row.title }),
          image: pin ? (pinImage(pin)?.url ?? null) : null,
          // One per pin and kind in the notification tray: shown twice (a
          // page and a push both reached the browser) it replaces itself.
          tag: `pin-${pinId}-${row.type}`,
        };
        emitWatchAlert(alert);
        await pushToUser(userId, alert);
      }),
    );
    return due.length;
  } finally {
    g.__chronopinWatchAlertBusy = false;
  }
}

// Tells a pin's watchers that it was updated - in the bell, and as a browser
// notification to each one newly told (a watcher who has not yet read the
// last one only has that one brought up to date). actorId is whoever made the
// update; left out (an article rewritten from its links) it is the pin's
// author. Never throws: the update it is about has already been saved.
export async function notifyWatchersOfUpdate(pinId: number, actorId?: number | null) {
  try {
    const { pin: found } = await Pin.queryById(pinId);
    if (!found) return;
    const pin = toJson<PinJson>(found);
    const actor = actorId ?? (pin.userId == null ? null : Number(pin.userId));
    if (actor == null) return;
    const threadWatcherIds = await ThreadWatch.watchersOf(pinId, { exceptId: actor });
    const userIds = await Notification.createForWatchers({ pinId, actorId: actor, threadWatcherIds });
    if (!userIds.length) return;
    const locales = await localesOf(userIds);
    const translators = new Map<Locale, Promise<Translator>>();
    await Promise.all(
      userIds.map(async (userId) => {
        const locale = locales.get(userId) ?? 'en';
        if (!translators.has(locale)) translators.set(locale, translatorFor(locale));
        const t = await translators.get(locale)!;
        const alert: WatchAlert = {
          userId,
          pinId,
          type: 'update',
          title: pin.title,
          body: t('alerts.update'),
          url: `${pinPath({ id: pinId, title: pin.title })}#updates`,
          image: pinImage(pin)?.url ?? null,
          tag: `pin-${pinId}-update`,
        };
        emitWatchAlert(alert);
        await pushToUser(userId, alert);
      }),
    );
  } catch (err) {
    log.warn(`telling pin ${pinId}'s watchers of its update failed:`, (err as Error).message);
  }
}

// A response has just joined a thread (posted under a pin, or moved there):
// whoever watches that thread now watches it too, and hears about it in the
// bell and the browser. Never throws - it runs after the response is sent.
export async function welcomeToThread(pinId: number, authorId: number) {
  try {
    const userIds = await ThreadWatch.welcome(pinId, authorId);
    if (!userIds.length) return;
    const { pin: found } = await Pin.queryById(pinId);
    if (!found) return;
    const pin = toJson<PinJson>(found);
    const locales = await localesOf(userIds);
    const translators = new Map<Locale, Promise<Translator>>();
    await Promise.all(
      userIds.map(async (userId) => {
        const locale = locales.get(userId) ?? 'en';
        if (!translators.has(locale)) translators.set(locale, translatorFor(locale));
        const t = await translators.get(locale)!;
        const alert: WatchAlert = {
          userId,
          pinId,
          type: 'thread',
          title: pin.title,
          body: t('alerts.thread'),
          url: pinPath({ id: pinId, title: pin.title }),
          image: pinImage(pin)?.url ?? null,
          tag: `pin-${pinId}-thread`,
        };
        emitWatchAlert(alert);
        await pushToUser(userId, alert);
      }),
    );
  } catch (err) {
    log.warn(`telling pin ${pinId}'s thread watchers failed:`, (err as Error).message);
  }
}

export function startWatchAlerts() {
  if (g.__chronopinWatchAlertTimer) return;
  const tick = () => void checkWatchAlerts().catch((err) => log.warn('watch alert check failed:', (err as Error).message));
  g.__chronopinWatchAlertTimer = setInterval(tick, CHECK_MS);
  g.__chronopinWatchAlertTimer.unref();
  tick();
}
