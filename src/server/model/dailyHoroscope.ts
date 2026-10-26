import { SUN_SIGN_SLUGS } from '@/lib/horoscope';
import { personalSky } from '../horoscope';
import * as db from '../db';
import UserBirth from './userBirth';

// The day's reading for a sun sign (0221). The page only reads these: the news
// job's horoscopes task writes them, so a visit never spends LLM credit.
export default class DailyHoroscope {
  static async get(sign: string, day: string): Promise<string | null> {
    const rows = await db.query<{ text: string }>(`SELECT "text" FROM "DailyHoroscope" WHERE "sign" = $1 AND "day" = $2`, [sign, day]);
    return rows[0]?.text ?? null;
  }

  // Writes or replaces a reading. False for a sign that is not one.
  static async save(sign: string, day: string, text: string): Promise<boolean> {
    if (!SUN_SIGN_SLUGS.includes(sign) || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !text.trim()) return false;
    await db.query(
      `INSERT INTO "DailyHoroscope" ("sign", "day", "text") VALUES ($1, $2, $3)
       ON CONFLICT ("sign", "day") DO UPDATE SET "text" = EXCLUDED."text"`,
      [sign, day, text.trim()],
    );
    return true;
  }

  static async getTransit(transits: string, day: string): Promise<string | null> {
    const rows = await db.query<{ text: string }>(`SELECT "text" FROM "TransitHoroscope" WHERE "transits" = $1 AND "day" = $2`, [transits, day]);
    return rows[0]?.text ?? null;
  }

  static async saveTransit(transits: string, day: string, text: string): Promise<boolean> {
    if (!transits.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !text.trim()) return false;
    await db.query(
      `INSERT INTO "TransitHoroscope" ("transits", "day", "text") VALUES ($1, $2, $3)
       ON CONFLICT ("transits", "day") DO UPDATE SET "text" = EXCLUDED."text"`,
      [transits.trim(), day, text.trim()],
    );
    return true;
  }

  // Who needs what for the given days: each distinct set of transits (with how
  // many users have it) and, for users with nothing in aspect, their sign,
  // each with the days still lacking a reading.
  static async needed(days: string[]) {
    const users = await db.query<{ id: number; birthday: string }>(
      `SELECT "id", to_char("birthday", 'YYYY-MM-DD') AS "birthday" FROM "User" WHERE "birthday" IS NOT NULL AND "utcDeletedDateTime" IS NULL`,
    );
    const births = await UserBirth.all();
    const transits = new Map<string, { users: number; day: string; transits: string[] }>();
    const signs = new Map<string, { users: number; day: string }>();
    for (const day of days) {
      for (const u of users) {
        const sky = personalSky(u.birthday, births.get(u.id) ?? null, day);
        if (!sky) continue;
        if (sky.key) {
          const k = `${day}|${sky.key}`;
          const row = transits.get(k) ?? { users: 0, day, transits: sky.transits.map((t) => `${t.planet} ${t.aspect} natal ${t.natal} (orb ${t.orb}°)`) };
          row.users += 1;
          transits.set(k, row);
        } else if (sky.sign) {
          const k = `${day}|${sky.sign}`;
          const row = signs.get(k) ?? { users: 0, day };
          row.users += 1;
          signs.set(k, row);
        }
      }
    }
    const haveT = await db.query<{ transits: string; day: string }>(`SELECT "transits", to_char("day", 'YYYY-MM-DD') AS "day" FROM "TransitHoroscope" WHERE "day" = ANY($1::date[])`, [days]);
    const haveS = await db.query<{ sign: string; day: string }>(`SELECT "sign", to_char("day", 'YYYY-MM-DD') AS "day" FROM "DailyHoroscope" WHERE "day" = ANY($1::date[])`, [days]);
    const doneT = new Set(haveT.map((r) => `${r.day}|${r.transits}`));
    const doneS = new Set(haveS.map((r) => `${r.day}|${r.sign}`));
    return {
      transits: [...transits].filter(([k]) => !doneT.has(k)).map(([k, v]) => ({ key: k.slice(k.indexOf('|') + 1), day: v.day, users: v.users, aspects: v.transits })).sort((a, b) => b.users - a.users),
      signs: [...signs].filter(([k]) => !doneS.has(k)).map(([k, v]) => ({ sign: k.slice(k.indexOf('|') + 1), day: v.day, users: v.users })).sort((a, b) => b.users - a.users),
    };
  }
}
