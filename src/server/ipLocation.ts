// Where an IP address is, from DB-IP's free "IP to City Lite" database
// (db-ip.com, CC BY 4.0: pages showing its places credit "IP Geolocation by
// DB-IP"). The file is looked up here, so no address leaves the server.
//
// The app has no volume of its own on the VM, so the file is downloaded into
// the temp directory on first use and again once it is a month old (DB-IP
// publishes on the 1st). It is ~130 MB unpacked and only the admin Clicks
// page needs it, so the reader is dropped after a few idle minutes rather
// than held for the life of the process.

import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { readFile, rename, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream } from 'node:stream/web';
import { createGunzip } from 'node:zlib';
import { Reader, type CityResponse } from 'mmdb-lib';
import log from './util/log';

const DIR = process.env.GEOIP_DIR || path.join(os.tmpdir(), 'chronopin-geoip');
const FILE = path.join(DIR, 'dbip-city-lite.mmdb');
const MAX_AGE_MS = 32 * 24 * 60 * 60 * 1000;
const IDLE_MS = 5 * 60 * 1000;
const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;

export type IpPlace = {
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

const state = ((globalThis as any).__chronopinIpLocation ??= { reader: null, idle: null }) as {
  reader: Promise<Reader<CityResponse>> | null;
  idle: NodeJS.Timeout | null;
};

// The places of these addresses, by address; an address the database does not
// place, or that is not an address, is left out.
export async function locate(ips: string[]): Promise<Map<string, IpPlace>> {
  const found = new Map<string, IpPlace>();
  if (!ips.length) return found;
  const reader = await open();
  for (const ip of ips) {
    let record: CityResponse | null = null;
    try {
      record = reader.get(ip);
    } catch {
      continue;
    }
    if (!record) continue;
    found.set(ip, {
      country: record.country?.iso_code ?? null,
      region: record.subdivisions?.[0]?.names?.en ?? null,
      city: record.city?.names?.en ?? null,
      latitude: record.location?.latitude ?? null,
      longitude: record.location?.longitude ?? null,
    });
  }
  return found;
}

function open(): Promise<Reader<CityResponse>> {
  if (state.idle) clearTimeout(state.idle);
  state.idle = setTimeout(() => {
    state.reader = null;
    state.idle = null;
  }, IDLE_MS);
  state.idle.unref?.();
  if (!state.reader) {
    const reader = ensureFile().then(async () => new Reader<CityResponse>(await readFile(FILE)));
    state.reader = reader;
    reader.catch(() => {
      if (state.reader === reader) state.reader = null;
    });
  }
  return state.reader;
}

async function ensureFile() {
  const fresh = existsSync(FILE) && Date.now() - statSync(FILE).mtimeMs < MAX_AGE_MS;
  if (fresh) return;
  try {
    await download();
  } catch (err) {
    // An old file still places most addresses; only no file at all fails.
    if (!existsSync(FILE)) throw err;
    log.warn('ipLocation', `kept the old database: ${(err as Error).message}`);
  }
}

// This month's file, or last month's when this month's is not out yet.
async function download() {
  mkdirSync(DIR, { recursive: true });
  const now = new Date();
  const months = [0, 1].map((back) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
  for (const month of months) {
    const res = await fetch(`https://download.db-ip.com/free/dbip-city-lite-${month}.mmdb.gz`, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (res.status === 404) continue;
    if (!res.ok || !res.body) throw new Error(`DB-IP download ${res.status}`);
    const partial = `${FILE}.${process.pid}.part`;
    try {
      await pipeline(Readable.fromWeb(res.body as ReadableStream), createGunzip(), createWriteStream(partial));
      await rename(partial, FILE);
    } finally {
      await rm(partial, { force: true });
    }
    log.info('ipLocation', `DB-IP city lite ${month} downloaded`);
    return;
  }
  throw new Error('DB-IP has no file for this month or the last');
}
