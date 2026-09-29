import getVideoId from 'get-video-id';
import _ from 'lodash';
import { mediumID } from '@/lib/appConfig';
import type { SuggestionMediaJson } from '@/lib/types';
import * as azureBlob from '../azureBlob';
import { emitPinEvent } from '../events';
import { choosePictures, type LabelledPicture, type MediaProblem } from '../extract/suggestion';
import * as image from '../image';
import { sameImageKey } from '../imageHash';
import Medium, { dropFromPin, droppedMedia, FULL_WEIGHT, setWeight, withoutRepeatedPictures, type ThumbMeta } from '../model/medium';
import Pin from '../model/pin';
import { findPinImages, pageImage } from '../scrape/findImages';
import log from '../util/log';
import { invalidatePin } from './cache';

// What a reader's suggestion does to a pin's pictures (0090). The review
// (src/server/extract/suggestion.ts) is shown the pin's media and flags the
// ones it looked at and found the reader right about. A flagged medium loses
// weight - all of it when it shows something else, half when it shows the
// right thing badly - and sorts after the rest. Pictures to replace it come
// from the pages the review just added, then from a fresh image search
// (findPinImages, as media:top-up), and none is added before Claude has looked
// at it (choosePictures). Each one added drops the lowest-weight flagged
// picture; a medium at DROP_AT or below goes anyway while the pin has another
// picture. Dropping keeps the row (dropFromPin), so the same picture is not
// found and added again.

// How many of a pin's media the review is shown.
const MAX_SHOWN = 8;
// Candidates looked at for each picture being replaced, and in all.
const CANDIDATES_EACH = 3;
const MAX_CANDIDATES = 8;
// A poor picture keeps half its weight; a second report takes it to DROP_AT.
const POOR_FACTOR = 0.5;
const DROP_AT = 0.25;

export type ShownMedium = { label: string; mediumId: number; kind: 'picture' | 'video'; url: string };
export type MediumFlag = { mediumId: number; problem: MediaProblem; reasoning: string };

const isPicture = (m: Medium) => Number(m.type) === mediumID.image;
const weightOf = (m: Medium) => (m.weight == null ? FULL_WEIGHT : Number(m.weight));

// The pin's pictures and videos as the review sees them, [M1], [M2]... in the
// order the pin shows them.
export function shownMedia(pin: Pin): ShownMedium[] {
  return (pin.media || [])
    .filter((m) => Number(m.type) === mediumID.image || Number(m.type) === mediumID.youtube)
    .slice(0, MAX_SHOWN)
    .map((m, i) => ({ label: `M${i + 1}`, mediumId: Number(m.id), kind: isPicture(m) ? 'picture' : 'video', url: m.originalUrl }));
}

// Their lines in the review's input.
export function mediaLines(shown: ShownMedium[]): string[] {
  if (!shown.length) return ["The pin's media: none"];
  return [
    "The pin's media, in the order it shows them (each attached after this text under its label):",
    ...shown.map((m) => `[${m.label}] ${m.kind === 'picture' ? 'picture' : 'YouTube video (its still is attached)'} - ${m.url}`),
  ];
}

// A medium as Claude is shown it: its thumb (a video's still), else the
// picture itself or the video's still on YouTube. Null when none will read;
// the review then goes on without it.
async function pictureOf(medium: Medium): Promise<Omit<LabelledPicture, 'label'> | null> {
  const videoId = Number(medium.type) === mediumID.youtube ? getVideoId(medium.originalUrl?.replace(/^\/\//, 'https://') || '').id : null;
  const urls = [
    medium.thumbName ? azureBlob.getBlobUrl(medium.thumbName) : null,
    isPicture(medium) ? medium.originalUrl : null,
    videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null,
  ].filter((url): url is string => !!url);
  for (const url of urls) {
    try {
      return await image.pictureForReview(await image.downloadImage(url));
    } catch {
      // Production has no thumbs, and an original can be gone from its host.
    }
  }
  return null;
}

export async function reviewPictures(pin: Pin, shown: ShownMedium[]): Promise<LabelledPicture[]> {
  const byId = new Map((pin.media || []).map((m) => [Number(m.id), m]));
  const pictures = await Promise.all(
    shown.map(async (s) => {
      const medium = byId.get(s.mediumId);
      const picture = medium && (await pictureOf(medium));
      return picture ? { label: s.label, ...picture } : null;
    }),
  );
  return pictures.filter((p): p is LabelledPicture => !!p);
}

type Candidate = { label: string; medium: Medium; thumb: ThumbMeta; picture: Omit<LabelledPicture, 'label'>; page?: string };

// Pictures that might replace the demoted ones, each downloaded and weighed
// against every picture the pin has or had: the lead pictures of the pages the
// review just added (they back the reader up), then a fresh search.
async function candidatesFor(pin: Pin, need: number, newReferenceUrls: string[], dropped: Medium[]): Promise<Candidate[]> {
  const known = [...pin.media, ...dropped];
  const skip = new Set(known.map((m) => m.originalUrl).filter(Boolean).map(sameImageKey));
  const found: { url: string; page?: string }[] = [];
  const add = (url: string, page?: string) => {
    const key = sameImageKey(url);
    if (skip.has(key)) return;
    skip.add(key);
    found.push({ url, page });
  };
  for (const page of newReferenceUrls) {
    const url = await pageImage(page).catch(() => undefined);
    if (url) add(url, page);
  }
  const search = await findPinImages(
    {
      title: pin.title,
      company: pin.company,
      companyWikiUrl: pin.companyWikiUrl,
      utcStartDateTime: pin.utcStartDateTime,
      references: pin.references.map((r) => ({ url: r.url, startDate: r.startDate, publishedDate: r.publishedDate })),
    },
    need * CANDIDATES_EACH,
    [...skip],
  ).catch((err) => {
    log.warn(`pin ${pin.id}: picture search failed -`, (err as Error).message);
    return { images: [] };
  });
  search.images.forEach((img) => add(img.originalUrl));

  const candidates: Candidate[] = [];
  for (const { url, page } of found) {
    if (candidates.length >= Math.min(need * CANDIDATES_EACH, MAX_CANDIDATES)) break;
    try {
      const thumb = await image.createThumbFromUrl(url);
      const medium = new Medium({ type: mediumID.image, originalUrl: url }, pin);
      medium._imageHash = thumb.hash;
      const { keep } = await withoutRepeatedPictures([medium], [...known, ...candidates.map((c) => c.medium)]);
      if (!keep.length) continue;
      candidates.push({ label: `C${candidates.length + 1}`, medium, thumb, picture: await image.pictureForReview(thumb.buffer), page });
    } catch (err) {
      log.warn(`pin ${pin.id}: candidate ${url.slice(0, 80)} unreadable -`, (err as Error).message);
    }
  }
  return candidates;
}

const plain = (html: string | null | undefined) => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// Finds, looks at and adds up to need pictures in place of the demoted ones.
// Nothing is added unseen: without an API key or credit it adds none, and the
// demoted pictures stay, at the back.
async function replace(pin: Pin, need: number, demoted: SuggestionMediaJson['demoted'], newReferenceUrls: string[]) {
  const dropped = await droppedMedia(pin.id);
  const candidates = await candidatesFor(pin, need, newReferenceUrls, dropped);
  if (!candidates.length) return [];
  const input = [
    `Pin: ${pin.title}`,
    pin.description ? `Description: ${plain(pin.description).slice(0, 1500)}` : null,
    pin.company ? `Company: ${pin.company}` : null,
    '',
    'Being replaced:',
    ...demoted.map((d) => `- a picture that ${d.problem === 'wrong' ? 'does not show the pin' : 'shows it badly'}: ${d.reasoning}`),
    '',
    'Candidates (attached after this text under their labels):',
    ...candidates.map((c) => `[${c.label}] ${c.medium.originalUrl}${c.page ? ` - the lead picture of ${c.page}` : ''}`),
  ]
    .filter((line) => line !== null)
    .join('\n');
  let choices;
  try {
    choices = await choosePictures(
      input,
      candidates.map((c) => ({ label: c.label, ...c.picture })),
    );
  } catch (err) {
    log.warn(`pin ${pin.id}: replacement pictures not looked at, none added -`, (err as Error).message);
    return [];
  }
  const added: SuggestionMediaJson['added'] = [];
  for (const choice of choices ?? []) {
    if (added.length >= need) break;
    const candidate = choice.use && candidates.find((c) => c.label === choice.candidate);
    if (!candidate) continue;
    try {
      await candidate.medium.addDownloadedThumb(candidate.thumb);
      await candidate.medium.save();
      pin.media.push(candidate.medium);
      added.push({ originalUrl: candidate.medium.originalUrl, reasoning: choice.reasoning });
    } catch (err) {
      log.warn(`pin ${pin.id}: could not add ${candidate.medium.originalUrl.slice(0, 80)} -`, (err as Error).message);
    }
  }
  return added;
}

// Applies a review's media flags to the pin: demotes them, replaces the
// pictures among them, and drops what the replacements (or a zero weight)
// push out. Null when there was nothing to do.
export async function applyMediaReview(
  pinId: number,
  flags: MediumFlag[],
  { newReferenceUrls = [], userId }: { newReferenceUrls?: string[]; userId?: number | null } = {},
): Promise<SuggestionMediaJson | null> {
  if (!flags.length) return null;
  const { pin } = await Pin.queryById(pinId);
  if (!pin) return null;

  const demoted: SuggestionMediaJson['demoted'] = [];
  const flagged: Medium[] = [];
  for (const flag of flags) {
    // Gone from the pin since the review was shown it.
    const medium = pin.media.find((m) => Number(m.id) === flag.mediumId);
    if (!medium) continue;
    const weight = flag.problem === 'wrong' ? 0 : Math.round(weightOf(medium) * POOR_FACTOR * 100) / 100;
    await setWeight(pinId, flag.mediumId, weight);
    medium.weight = weight;
    flagged.push(medium);
    demoted.push({ mediumId: flag.mediumId, originalUrl: medium.originalUrl, problem: flag.problem, reasoning: flag.reasoning, weight, dropped: false });
  }
  if (!demoted.length) return null;

  // Videos are demoted and dropped but not replaced: a pin's video comes from
  // its own page (media:videos), not an image search.
  const need = flagged.filter(isPicture).length;
  const added = need ? await replace(pin, need, demoted, newReferenceUrls) : [];

  let replacements = added.length;
  const standing = new Set(pin.media);
  for (const medium of _.sortBy(flagged, weightOf)) {
    const otherPicture = [...standing].some((m) => m !== medium && isPicture(m) && weightOf(m) > DROP_AT);
    const replaced = isPicture(medium) && replacements > 0;
    if (!replaced && !(weightOf(medium) <= DROP_AT && (otherPicture || !isPicture(medium)))) continue;
    if (replaced) replacements--;
    await dropFromPin(pinId, Number(medium.id));
    standing.delete(medium);
    demoted.find((d) => d.mediumId === Number(medium.id))!.dropped = true;
  }

  const { pin: updated } = await Pin.queryById(pinId);
  if (updated) emitPinEvent('update', updated, { userId: userId ?? undefined });
  try {
    invalidatePin(pinId);
  } catch {
    // Outside a Next.js server (suggestions:review), there is no page cache to expire.
  }
  return { demoted, added };
}
