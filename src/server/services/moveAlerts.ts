import { biggestMove, formatMove, moveSubject, STOCK_BASELINE_KEY, unitOf, type MoveBaseline, type MoveInfo, type MoveKind } from '@/lib/moveAlerts';
import { localeOr, type Locale } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translate';
import { marketRefKey, pinMarketRefs, type MarketRef } from '@/lib/predictionMarkets';
import { pinImage, pinPath } from '@/lib/seo';
import { toJson, type PinJson } from '@/lib/types';
import * as db from '../db';
import { emitWatchAlert, type WatchAlert } from '../events';
import MoveAlert, { type DueAlert } from '../model/moveAlert';
import Notification from '../model/notification';
import Pin from '../model/pin';
import PremiumSubscription from '../model/premiumSubscription';
import { oddsFor } from '../predictionMarkets';
import { pushToUser } from '../push';
import { identify } from '../stocks';
import log from '../util/log';
import { localesOf, translatorFor } from './watchAlerts';

// Premium price and odds alerts (MoveAlert, 0236). Every CHECK_MS the server
// reads each market and stock that anyone with a live alert watches (once,
// however many readers share it), and tells a reader whose alert it has
// moved past: in the bell, over the live feed and as a Web Push. The move is
// measured from the baseline stored with the alert, which telling the reader
// resets, so one swing is one notification. Alerts of readers whose plan has
// lapsed stay stored and are skipped, so renewing turns them back on.

const CHECK_MS = 60 * 1000;
const READ_CONCURRENCY = 4;

const g = globalThis as unknown as { __chronopinMoveAlertTimer?: ReturnType<typeof setInterval>; __chronopinMoveAlertBusy?: boolean };

export class AlertSubjectError extends Error {}

// What an alert on a market or stock reads today: points of chance per
// outcome, or the price. Null when the exchange cannot be reached or the
// subject is gone.
export async function currentValues(kind: MoveKind, subject: string, ref: MarketRef | null): Promise<{ values: MoveBaseline; title: string } | null> {
  try {
    if (kind === 'market') {
      const odds = ref ? await oddsFor(ref) : null;
      if (!odds) return null;
      const values: MoveBaseline = {};
      for (const outcome of odds.outcomes) if (outcome.probability != null) values[outcome.label] = outcome.probability * 100;
      return Object.keys(values).length ? { values, title: odds.title } : null;
    }
    const found = await identify(subject);
    return found ? { values: { [STOCK_BASELINE_KEY]: found.quote.price }, title: found.quote.name } : null;
  } catch (err) {
    log.warn(`move alert read of ${subject} failed:`, (err as Error).message);
    return null;
  }
}

// The market a pin links to under this key, from the pin's own links.
export async function marketOnPin(pinId: number, key: string): Promise<{ ref: MarketRef; pinTitle: string } | null> {
  const { pin } = await Pin.queryById(pinId);
  if (!pin) return null;
  const json = toJson<PinJson>(pin);
  const ref = pinMarketRefs(json).find((r) => marketRefKey(r) === key);
  return ref ? { ref, pinTitle: json.title } : null;
}

async function tell(alert: DueAlert, key: string, from: number, to: number, locales: Map<number, Locale>, translators: Map<Locale, Promise<Translator>>) {
  const move: MoveInfo = { kind: alert.kind, label: alert.label, outcome: alert.kind === 'market' ? key : null, from, to, unit: unitOf(alert.kind) };
  await Notification.createMove({ userId: alert.userId, pinId: alert.pinId, move });
  const locale = locales.get(alert.userId) ?? localeOr(undefined);
  if (!translators.has(locale)) translators.set(locale, translatorFor(locale));
  const t = await translators.get(locale)!;
  let url = '/';
  let image: string | null = null;
  let title = alert.label;
  if (alert.pinId != null) {
    const { pin } = await Pin.queryById(alert.pinId);
    if (pin) {
      const json = toJson<PinJson>(pin);
      title = json.title;
      url = pinPath({ id: alert.pinId, title: json.title });
      image = pinImage(json)?.url ?? null;
    }
  }
  const push: WatchAlert = {
    userId: alert.userId,
    pinId: alert.pinId ?? 0,
    type: 'move',
    title,
    body: t(to > from ? 'moveAlerts.rose' : 'moveAlerts.fell', { label: moveSubject(move), from: formatMove(alert.kind, from), to: formatMove(alert.kind, to) }),
    url,
    image,
    tag: `move-${alert.id}`,
  };
  emitWatchAlert(push);
  await pushToUser(alert.userId, push);
}

async function allowedUsers(): Promise<Set<number>> {
  const [paid, admins] = await Promise.all([
    PremiumSubscription.activeUserIds(),
    db.query<{ id: number }>(`SELECT "id" FROM "User" WHERE "role" = 'admin' AND "utcDeletedDateTime" IS NULL`),
  ]);
  return new Set([...paid, ...admins.map((r) => Number(r.id))]);
}

export async function checkMoveAlerts(): Promise<number> {
  if (g.__chronopinMoveAlertBusy) return 0;
  g.__chronopinMoveAlertBusy = true;
  try {
    const [rows, allowed] = await Promise.all([MoveAlert.live(), allowedUsers()]);
    const alerts = rows.filter((a) => allowed.has(Number(a.userId)));
    if (!alerts.length) return 0;

    const bySubject = new Map<string, DueAlert[]>();
    for (const a of alerts) {
      const key = `${a.kind}|${a.subject}`;
      bySubject.set(key, [...(bySubject.get(key) ?? []), a]);
    }
    const groups = [...bySubject.values()];
    const locales = await localesOf([...new Set(alerts.map((a) => Number(a.userId)))]);
    const translators = new Map<Locale, Promise<Translator>>();
    let sent = 0;

    const work = async (group: DueAlert[]) => {
      const now = await currentValues(group[0].kind, group[0].subject, group[0].ref);
      if (!now) return;
      for (const alert of group) {
        try {
          // First read: measured from now on.
          if (!alert.baseline) {
            await MoveAlert.rebase(alert.id, now.values);
            continue;
          }
          // An outcome that was not there before is measured from now on too.
          let baseline = alert.baseline;
          if (Object.keys(now.values).some((k) => baseline[k] == null)) {
            baseline = { ...now.values, ...baseline };
            await MoveAlert.rebase(alert.id, baseline);
          }
          const move = biggestMove(alert.kind, alert.threshold, baseline, now.values);
          if (!move) continue;
          // Whoever still holds the baseline it measured from tells the reader.
          if (!(await MoveAlert.claim(alert.id, baseline, now.values))) continue;
          await tell(alert, move.key, move.from, move.to, locales, translators);
          sent++;
        } catch (err) {
          log.warn(`move alert ${alert.id} failed:`, (err as Error).message);
        }
      }
    };

    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(READ_CONCURRENCY, groups.length) }, async () => {
        while (next < groups.length) await work(groups[next++]);
      }),
    );
    return sent;
  } finally {
    g.__chronopinMoveAlertBusy = false;
  }
}

export function startMoveAlerts() {
  if (g.__chronopinMoveAlertTimer) return;
  const tick = () => void checkMoveAlerts().catch((err) => log.warn('move alert check failed:', (err as Error).message));
  g.__chronopinMoveAlertTimer = setInterval(tick, CHECK_MS);
  g.__chronopinMoveAlertTimer.unref();
}
