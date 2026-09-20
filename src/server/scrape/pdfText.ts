// A PDF link's text. Filings, agency dockets, environmental statements and
// regulator letters are often the only source an infrastructure, energy,
// policy or health pin has, and until now the reader refused them outright:
// pageText() threw "Unsupported content type application/pdf", and because the
// fetch stage is the one stage that may fail a whole scrape, a PDF link killed
// the job rather than degrading.
//
// Two things can be true of a PDF. It has a text layer, which is a fast local
// extraction, or it is a scan, which needs OCR at seconds a page. So the text
// layer is tried first and OCR runs only when there is effectively no text at
// all, over the first few pages, as a last resort.
//
// Both readers are external binaries (poppler's pdftotext/pdfinfo/pdftoppm and
// tesseract). They are checked for rather than assumed: where they are missing
// the error names the binary and the install, because that message is what a
// session or a deploy has to act on.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import config from '../config';

const run = promisify(execFile);

export type PdfText = { title?: string; text: string };

// A filing can run to hundreds of pages; the extractor only ever reads the
// first 60,000 characters, so there is no point rendering all of them.
const MAX_PDF_BYTES = 40 * 1024 * 1024;
const TEXT_PAGES = 50;
// OCR is the expensive path: about a second a page at 300 dpi, which is the
// resolution tesseract is trained around.
const OCR_PAGES = 5;
const OCR_DPI = 300;
const FETCH_TIMEOUT_MS = 30000;
const TEXT_TIMEOUT_MS = 60000;
const OCR_TIMEOUT_MS = 180000;
// Below this a "text layer" is page furniture - a header, a page number - and
// the document is really a scan.
const SCAN_THRESHOLD = 200;

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

// Whether a binary is on PATH, asked once per process.
const present = new Map<string, Promise<boolean>>();
export function hasBinary(name: string): Promise<boolean> {
  if (!present.has(name)) {
    present.set(
      name,
      run('which', [name])
        .then(() => true)
        .catch(() => false),
    );
  }
  return present.get(name)!;
}

// The document's own title, and how many pages it has, from pdfinfo. Neither
// is essential, so a pdfinfo that fails costs nothing.
export function parsePdfInfo(stdout: string): { title?: string; pages?: number } {
  // [^\S\n] and not \s: pdfinfo prints an absent title as "Title:" followed by
  // padding and a newline, and \s+ would cross that newline and capture the
  // line after it, so every untitled PDF came back titled "Author:".
  const title = stdout.match(/^Title:[^\S\n]+(.+)$/m)?.[1]?.trim();
  const pages = Number(stdout.match(/^Pages:[^\S\n]+(\d+)$/m)?.[1]);
  // A producer often writes the source filename in as the title; it is
  // better than nothing but not when it is plainly a path or "untitled".
  const useful = title && !/^(untitled|microsoft word|document\d*)$/i.test(title) && !/\.(docx?|indd|pdf)$/i.test(title);
  return { title: useful ? title : undefined, pages: Number.isFinite(pages) ? pages : undefined };
}

async function pdfInfo(file: string): Promise<{ title?: string; pages?: number }> {
  try {
    const { stdout } = await run('pdfinfo', [file], { timeout: TEXT_TIMEOUT_MS });
    return parsePdfInfo(stdout);
  } catch {
    return {};
  }
}

// Plain mode, not -layout. -layout preserves the geometry, which is right for
// a table and wrong for everything else: on a three-column Federal Register
// notice it interleaves the columns line by line, so every sentence reads as
// three unrelated half-sentences and an extractor makes nothing of it. Plain
// mode does the reading-order analysis and returns column after column.
async function textLayer(file: string): Promise<string> {
  const { stdout } = await run('pdftotext', ['-l', String(TEXT_PAGES), file, '-'], {
    timeout: TEXT_TIMEOUT_MS,
    maxBuffer: 32 * 1024 * 1024,
  });
  return stdout;
}

// Render the first pages and read them with tesseract. Deliberately poppler
// plus tesseract rather than ocrmypdf: those two are already required above,
// and ocrmypdf would pull in Ghostscript for a PDF nobody is going to keep.
async function ocr(file: string, dir: string, pages: number): Promise<string> {
  if (!config.pdf.ocr) return '';
  if (!(await hasBinary('pdftoppm')) || !(await hasBinary('tesseract'))) return '';
  const prefix = join(dir, 'page');
  await run('pdftoppm', ['-png', '-r', String(OCR_DPI), '-l', String(pages), file, prefix], { timeout: OCR_TIMEOUT_MS });
  const images = (await readdir(dir)).filter((f) => f.startsWith('page') && f.endsWith('.png')).sort();
  const out: string[] = [];
  for (const image of images) {
    const { stdout } = await run('tesseract', [join(dir, image), '-'], { timeout: OCR_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 }).catch(() => ({ stdout: '' }));
    if (stdout.trim()) out.push(stdout);
  }
  return out.join('\n\n');
}

// Column layout leaves long runs of spaces; collapse them without losing the
// line breaks that separate one dated row from the next.
function tidy(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/\f/g, '\n')
    .replace(/[ \t]{2,}/g, '  ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// A PDF always begins %PDF, within the first few bytes. Worth checking
// because plenty of servers label one application/octet-stream, and a block
// page labelled application/pdf is not unheard of either.
export function looksLikePdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 1024).includes('%PDF');
}

/**
 * The text of the PDF at `url`. `preloaded` is the body of an already-made
 * fetch of that URL, so a caller that had to read the bytes to recognise it
 * does not pay for a second download.
 */
export async function fetchPdfText(url: string, preloaded?: Buffer): Promise<PdfText> {
  if (!(await hasBinary('pdftotext'))) {
    throw new Error(`Cannot read the PDF at ${url}: pdftotext is not installed (brew install poppler)`);
  }
  let buffer = preloaded;
  if (!buffer) {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/pdf,*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`PDF fetch failed with ${res.status} at ${url}`);
    buffer = Buffer.from(await res.arrayBuffer());
  }
  if (!buffer.length) throw new Error(`Empty PDF at ${url}`);
  if (buffer.length > MAX_PDF_BYTES) {
    throw new Error(`PDF at ${url} is ${Math.round(buffer.length / 1024 / 1024)}MB, over the ${MAX_PDF_BYTES / 1024 / 1024}MB limit`);
  }
  // A server that mislabels HTML as a PDF is a block page often enough to be
  // worth catching here, where the caller can still fall back to the browser.
  if (!looksLikePdf(buffer)) {
    throw new Error(`The file at ${url} is not a PDF despite its content type`);
  }

  const dir = await mkdtemp(join(tmpdir(), 'chronopin-pdf-'));
  const file = join(dir, 'source.pdf');
  try {
    await writeFile(file, buffer);
    const [{ title, pages }, layer] = await Promise.all([pdfInfo(file), textLayer(file).catch(() => '')]);
    let text = tidy(layer);
    let scanned = false;
    if (text.length < SCAN_THRESHOLD) {
      const read = tidy(await ocr(file, dir, Math.min(OCR_PAGES, pages ?? OCR_PAGES)).catch(() => ''));
      if (read.length > text.length) {
        text = read;
        scanned = true;
      }
    }
    if (!text) {
      throw new Error(`No text in the PDF at ${url}: it has no text layer and OCR read nothing`);
    }
    // Say which pages were read, so a summary written from this is not taken
    // for the whole document.
    const note =
      scanned
        ? `[Scanned PDF, ${pages ?? '?'} page(s); OCR of the first ${Math.min(OCR_PAGES, pages ?? OCR_PAGES)}]`
        : pages && pages > TEXT_PAGES
          ? `[PDF, ${pages} pages; text of the first ${TEXT_PAGES}]`
          : `[PDF, ${pages ?? '?'} page(s)]`;
    return { title, text: `${note}\n\n${text}` };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
