// Named tropical cyclones as pins, kept current: NASA EONET publishes each
// storm from the warning agencies (JTWC, NOAA NHC) with a dated position and
// wind speed every six hours. A storm that reached hurricane/typhoon strength
// (64+ knots) is one confirmed 'Disaster' pin at its first position, sourced to
// its EONET event record, carrying the track as a flight path and up to three
// NASA Worldview satellite pictures (first day, peak-wind day, latest day).
// syncStorms makes the pins for new storms and, for pinned storms whose track
// has grown or ended, extends the track, end date, peak and pictures.
// Shared by scripts/events/storms.ts (admin token) and the news job's
// storm_tracks tool (curator tokens); only the transport differs.

export type Geometry = { magnitudeValue: number | null; date: string; coordinates: [number, number] };
export type EonetEvent = { id: string; title: string; link: string; closed: string | null; sources: { id: string; url: string }[]; geometry: Geometry[] };
export type FlightPath = { label: string; sourceUrl: string; estimated: boolean; points: [number, number][] };
type Medium = { type: number; originalUrl: string };

export type StormTransport = {
  // The pin with this sourceUrl, if any, as { id, track length, end date, media }.
  find(sourceUrl: string): Promise<{ id: number; points: number; end: string | null; media: { id?: number; originalUrl: string }[] } | null>;
  create(body: Record<string, unknown>): Promise<number>;
  update(id: number, patch: { fields: Record<string, unknown>; addMedia: Medium[]; removeMediumIds: number[] }): Promise<void>;
  saveTrack(id: number, path: FlightPath): Promise<void>;
};

const AGENCIES: Record<string, string> = { JTWC: 'the Joint Typhoon Warning Center', NOAA_NHC: "NOAA's National Hurricane Center", EO: 'NASA Earth Observatory' };
const UA = { 'User-Agent': 'chronopin (storms)' };

export async function fetchStorms(days = 30, minKts = 64): Promise<EonetEvent[]> {
  const res = await fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=${days}&category=severeStorms&limit=200`, { headers: UA });
  if (!res.ok) throw new Error(`EONET ${res.status}`);
  return ((await res.json()) as { events: EonetEvent[] }).events.filter((e) => /cyclone|hurricane|typhoon|storm/i.test(e.title) && e.geometry.length >= 3 && Math.max(...e.geometry.map((g) => g.magnitudeValue ?? 0)) >= minKts);
}

const snapshot = (day: string, [lon, lat]: [number, number]) => {
  const half = 10;
  const bbox = [Math.max(-90, lat - half), lon - half, Math.min(90, lat + half), lon + half].map((n) => n.toFixed(2)).join(',');
  return `https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&LAYERS=VIIRS_SNPP_CorrectedReflectance_TrueColor&CRS=EPSG:4326&TIME=${day}&BBOX=${bbox}&FORMAT=image/jpeg&WIDTH=1024&HEIGHT=1024`;
};
const isSnapshot = (url: string) => url.startsWith('https://wvs.earthdata.nasa.gov/api/v1/snapshot?');

// First day, peak-wind day and latest day, each a 20-degree box on the storm's position that day.
export function stormFrames(e: EonetEvent): Medium[] {
  const track = [...e.geometry].sort((a, b) => a.date.localeCompare(b.date));
  const peak = track.reduce((a, g) => ((g.magnitudeValue ?? 0) > (a.magnitudeValue ?? 0) ? g : a));
  const seen = new Set<string>();
  return [track[0], peak, track[track.length - 1]].filter((g) => !seen.has(g.date.slice(0, 10)) && seen.add(g.date.slice(0, 10))).map((g) => ({ type: 1, originalUrl: snapshot(g.date.slice(0, 10), g.coordinates) }));
}

export function stormTrack(e: EonetEvent): FlightPath {
  const track = [...e.geometry].sort((a, b) => a.date.localeCompare(b.date));
  return { label: `${e.title} track`, sourceUrl: e.link, estimated: false, points: track.map((g) => [g.coordinates[1], g.coordinates[0]] as [number, number]) };
}

// The text fields, which change as the track grows (the end, and sometimes the peak).
export function stormFields(e: EonetEvent) {
  const track = [...e.geometry].sort((a, b) => a.date.localeCompare(b.date));
  const first = track[0];
  const last = track[track.length - 1];
  const peak = track.reduce((a, g) => ((g.magnitudeValue ?? 0) > (a.magnitudeValue ?? 0) ? g : a));
  const kts = peak.magnitudeValue ?? 0;
  const agencies = e.sources.map((s) => AGENCIES[s.id]).filter(Boolean);
  const day = (iso: string) => iso.slice(0, 10);
  return {
    title: `${e.title} peaks at ${kts} knots`,
    description: [
      `${e.title} was tracked from ${day(first.date)} to ${day(last.date)} (${track.length} six-hourly positions), reaching maximum sustained winds of ${kts} knots (${Math.round(kts * 1.15078)} mph, ${Math.round(kts * 1.852)} km/h) on ${day(peak.date)}.`,
      agencies.length ? `The positions and wind speeds are ${agencies.join(' and ')}'s own warnings, compiled by NASA's Earth Observatory Natural Event Tracker (EONET).` : "The positions and wind speeds are compiled by NASA's Earth Observatory Natural Event Tracker (EONET).",
      e.closed ? `The storm was listed as ended on ${day(e.closed)}.` : 'The storm was still listed as active at the time of the last update.',
    ].join(' '),
    utcEndDateTime: e.closed ?? null,
    dateConfidenceReasoning: "The start is the storm's first dated position in the warning agencies' track; the track and end date are updated while the storm is active.",
  };
}

export function stormPinBody(e: EonetEvent) {
  const first = [...e.geometry].sort((a, b) => a.date.localeCompare(b.date))[0];
  return {
    ...stormFields(e),
    sourceUrl: e.link,
    address: `${first.coordinates[1].toFixed(1)}, ${first.coordinates[0].toFixed(1)}`,
    latitude: first.coordinates[1],
    longitude: first.coordinates[0],
    allDay: false,
    utcStartDateTime: first.date,
    dateConfidence: 'confirmed',
    categories: ['Disaster'],
    media: stormFrames(e),
    flightPath: stormTrack(e),
  };
}

export type StormSync = { created: { id: number; title: string }[]; updated: { id: number; title: string; points: number; ended: boolean }[]; unchanged: number };

// New storms become pins; a pinned storm whose track grew or ended is brought up to date.
export async function syncStorms(transport: StormTransport, { days = 30, minKts = 64, dry = false } = {}): Promise<StormSync> {
  const out: StormSync = { created: [], updated: [], unchanged: 0 };
  for (const e of (await fetchStorms(days, minKts)).sort((a, b) => a.geometry[0].date.localeCompare(b.geometry[0].date))) {
    const body = stormPinBody(e);
    const pin = await transport.find(e.link);
    if (!pin) {
      if (!dry) out.created.push({ id: await transport.create(body), title: body.title });
      else out.created.push({ id: 0, title: body.title });
      continue;
    }
    const grew = pin.points !== body.flightPath.points.length;
    const ended = !!e.closed && !pin.end;
    if (!grew && !ended) { out.unchanged++; continue; }
    if (!dry) {
      const wanted = body.media.map((m) => m.originalUrl);
      const have = new Set(pin.media.map((m) => m.originalUrl));
      const { flightPath: _f, media: _m, ...fields } = body;
      await transport.update(pin.id, {
        fields: { title: fields.title, description: fields.description, utcEndDateTime: fields.utcEndDateTime, dateConfidenceReasoning: fields.dateConfidenceReasoning },
        addMedia: body.media.filter((m) => !have.has(m.originalUrl)),
        // Only our own satellite frames are swapped: a stale last-day or old-peak picture goes.
        removeMediumIds: pin.media.filter((m) => m.id != null && isSnapshot(m.originalUrl) && !wanted.includes(m.originalUrl)).map((m) => m.id!),
      });
      await transport.saveTrack(pin.id, body.flightPath);
    }
    out.updated.push({ id: pin.id, title: body.title, points: body.flightPath.points.length, ended });
  }
  return out;
}
