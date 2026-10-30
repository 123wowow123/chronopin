// Orange and red flood alerts from GDACS (the UN/EU Global Disaster Alert and
// Coordination System) as pins, with the satellite- and model-derived flood
// extent drawn on the map (PinSiteShape kind 'flood'). GDACS publishes each
// event with GeoJSON polygons; the "Affected area" polygon is the extent.
// Drought stubs, volcano alert circles (a modelled 30 km radius, not an impact)
// and cyclones and quakes (already pinned from NASA EONET and USGS) are left out.
//
//   npx tsx scripts/events/gdacs.ts --dry
//   npx tsx scripts/events/gdacs.ts --days 90
//
// Posts as @QuakeDesk through POST /api/admin/db/Pin, then the extent through
// /api/admin/db/PinSiteShape (an admin token). A flood already pinned is
// refused by the route's duplicate-sourceUrl check and skipped.

import '../env';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { simplifyForDisplay, type PinSiteShapeJson, type SiteFeature } from '@/lib/siteShape';

const { values: flags } = parseArgs({
  options: { dry: { type: 'boolean', default: false }, days: { type: 'string', default: '90' }, base: { type: 'string', default: 'https://www.chronopin.com' }, desk: { type: 'string', default: 'QuakeDesk' } },
});
const BASE = flags.base!.replace(/\/$/, '');
const UA = { 'User-Agent': 'chronopin (gdacs)' };

type Alert = { properties: { eventid: number; episodeid: number; alertlevel: string; country: string; fromdate: string; todate: string; source: string; url: { geometry: string }; affectedcountries?: { countryname: string }[] }; geometry: { coordinates: [number, number] } };

const iso = (d: Date) => d.toISOString().slice(0, 10);

async function floods(): Promise<Alert[]> {
  const to = new Date();
  const from = new Date(to.getTime() - Number(flags.days) * 864e5);
  const res = await fetch(`https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=FL&fromdate=${iso(from)}&todate=${iso(to)}&alertlevel=Orange;Red`, { headers: UA });
  if (!res.ok) throw new Error(`GDACS ${res.status}`);
  return ((await res.json()) as { features: Alert[] }).features;
}

async function extent(a: Alert): Promise<PinSiteShapeJson | null> {
  const res = await fetch(a.properties.url.geometry, { headers: UA });
  if (!res.ok) return null;
  const area = ((await res.json()) as { features: { geometry: SiteFeature['geometry']; properties: { Class: string } }[] }).features.find((f) => f.properties.Class === 'Poly_Affected');
  if (!area) return null;
  const report = `https://www.gdacs.org/report.aspx?eventid=${a.properties.eventid}&eventtype=FL`;
  const shape: PinSiteShapeJson = {
    geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: area.geometry, properties: { kind: 'flood', name: 'Flood extent', source: 'GDACS', sourceUrl: report, observedAt: a.properties.todate.slice(0, 10) } as never }] },
    source: 'GDACS',
    sourceUrl: report,
  };
  // The stored copy is already display-sized: a flood extent can be megabytes.
  return simplifyForDisplay(shape, 15000);
}

function pinBody(a: Alert) {
  const p = a.properties;
  const [longitude, latitude] = a.geometry.coordinates;
  const country = p.country.includes(',') ? p.affectedcountries?.map((c) => c.countryname).join(', ') ?? p.country : p.country;
  const report = `https://www.gdacs.org/report.aspx?eventid=${p.eventid}&eventtype=FL`;
  const day = (s: string) => s.slice(0, 10);
  const level = p.alertlevel.toLowerCase();
  const active = new Date(p.todate + 'Z').getTime() > Date.now() - 2 * 864e5;
  return {
    title: `Flooding in ${country} reaches a GDACS ${level} alert in ${new Date(p.fromdate + 'Z').toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`,
    description: [
      `GDACS, the UN and European Commission disaster alert system, rated flooding in ${country} at its ${level} level, tracking it from ${day(p.fromdate)} to ${day(p.todate)}.`,
      `The flood extent drawn on the map is GDACS's affected-area polygon, built from the ${p.source === 'GLOFAS' ? 'Copernicus GloFAS river-flow forecast' : p.source} and satellite water detection; it shows where water was detected or forecast, not damage or casualties.`,
      active ? 'The event was still listed as active at the time of the last update.' : 'GDACS listed the event as ended.',
    ].join(' '),
    sourceUrl: report,
    address: country,
    latitude,
    longitude,
    allDay: false,
    utcStartDateTime: new Date(p.fromdate + 'Z').toISOString(),
    utcEndDateTime: active ? null : new Date(p.todate + 'Z').toISOString(),
    dateConfidence: 'confirmed',
    dateConfidenceReasoning: "The dates are GDACS's own start and last-update times for the flood event; the end moves while the event is active.",
    categories: ['Disaster'],
    media: [] as { type: number; originalUrl: string }[],
    userName: flags.desk,
  };
}

async function main() {
  const alerts = await floods();
  // One pin per event: the newest episode of each.
  const latest = [...new Map(alerts.sort((a, b) => a.properties.episodeid - b.properties.episodeid).map((a) => [a.properties.eventid, a])).values()];
  const bodies = latest.map((a) => ({ alert: a, body: pinBody(a) }));
  for (const { body } of bodies) console.log(`${body.utcStartDateTime.slice(0, 10)} ${body.title}`);
  if (flags.dry) return;
  const file = path.resolve('.scrape/admin.token');
  if (!existsSync(file)) throw new Error('No admin token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${readFileSync(file, 'utf8').trim()}` };
  const res = await fetch(`${BASE}/api/admin/db/Pin`, { method: 'POST', headers, body: JSON.stringify(bodies.map((b) => b.body)) });
  const data = (await res.json()) as { results?: { index: number; id?: number; error?: string }[] };
  for (const r of data.results ?? []) {
    const { alert, body } = bodies[r.index];
    if (!r.id) { console.log(`skipped ${body.title}: ${String(r.error).slice(0, 120)}`); continue; }
    const shape = await extent(alert);
    if (shape) {
      const put = await fetch(`${BASE}/api/admin/db/PinSiteShape?upsert=1`, { method: 'POST', headers, body: JSON.stringify([{ pinId: r.id, geojson: shape.geojson, source: shape.source, sourceUrl: shape.sourceUrl }]) });
      console.log(`pin ${r.id} <- ${body.title} (extent ${put.status})`);
    } else console.log(`pin ${r.id} <- ${body.title} (no extent)`);
  }
}

main().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
