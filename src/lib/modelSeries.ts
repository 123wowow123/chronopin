// The AI model a pin's title is about, for threading a model line's releases
// and updates in order (Claude Opus 4.5 <- 4.6 <- 4.7, GPT-4o update <- next
// GPT-4o update). Only the big families are known, on purpose: a thread is
// only worth it for a series of incremental releases of the same product, so
// a title that names no known model line is never threaded.
//
// line: the product line - family plus tier or variant ("claude opus",
// "gpt mini", "o pro"). version: its number, compared part by part. model:
// the exact model ("gpt 4o mini"), so updates to one model chain together.

export type ModelRelease = { line: string; version: number[]; model: string };

type Pattern = { re: RegExp; read: (m: RegExpExecArray) => { family: string; version: string; variants?: string[] } };

const VERSION = String.raw`(\d+(?:\.\d+)?)`;
const GPT_VARIANTS = /(?:[- ](?:mini|nano|pro|instant|thinking|codex|max|sol|turbo))+/;

const PATTERNS: Pattern[] = [
  // Claude Opus 4.5 / Claude 3.5 Sonnet
  { re: new RegExp(String.raw`\bclaude[- ](opus|sonnet|haiku)[- ]${VERSION}\b`), read: (m) => ({ family: `claude ${m[1]}`, version: m[2] }) },
  { re: new RegExp(String.raw`\bclaude[- ]${VERSION}[- ](opus|sonnet|haiku)\b`), read: (m) => ({ family: `claude ${m[2]}`, version: m[1] }) },
  // gpt-oss-120b: sizes, not versions.
  { re: /\bgpt-oss\b/, read: () => ({ family: 'gpt-oss', version: '0' }) },
  // GPT-4o, GPT 4o-mini, GPT-5.2 Thinking, GPT-5.3-Codex, GPT-5-Codex-Max
  {
    re: new RegExp(String.raw`\bgpt[- ]?${VERSION}(o)?(${GPT_VARIANTS.source})?(?![\w.])`),
    read: (m) => ({ family: 'gpt', version: `${m[1]}${m[2] ?? ''}`, variants: (m[3] ?? '').split(/[- ]/).filter(Boolean) }),
  },
  // o1-preview, o3, o3-pro, o4-mini
  { re: /\bo(\d)(?:[- ](mini|pro|preview))?\b/, read: (m) => ({ family: 'o', version: m[1], variants: m[2] ? [m[2]] : [] }) },
  {
    re: new RegExp(String.raw`\bgemini[- ]${VERSION}(?:[- ](pro|flash-lite|flash|ultra|nano))?\b`),
    read: (m) => ({ family: 'gemini', version: m[1], variants: m[2] ? [m[2]] : [] }),
  },
  { re: new RegExp(String.raw`\bllama[- ]?${VERSION}\b`), read: (m) => ({ family: 'llama', version: m[1] }) },
  { re: new RegExp(String.raw`\bgrok[- ]?${VERSION}\b`), read: (m) => ({ family: 'grok', version: m[1] }) },
  { re: new RegExp(String.raw`\bdeepseek[- ]?(v|r)${VERSION}\b`), read: (m) => ({ family: `deepseek ${m[1]}`, version: m[2] }) },
];

// Every model of a known line the title names, in order: "OpenAI o3 and
// o4-mini" is about o3 first, and o4-mini too.
export function modelReleases(title: string | null | undefined): ModelRelease[] {
  // Non-breaking hyphens (GPT‑5.3‑Codex) read as hyphens.
  const text = (title ?? '').toLowerCase().replace(/[‐‑‒–]/g, '-');
  const found: { at: number; end: number; release: ModelRelease }[] = [];
  for (const { re, read } of PATTERNS) {
    for (const m of text.matchAll(new RegExp(re.source, 'g'))) {
      const { family, version, variants = [] } = read(m as RegExpExecArray);
      found.push({
        at: m.index,
        end: m.index + m[0].length,
        release: {
          line: [family, ...variants].join(' '),
          version: version.split('.').map((part) => parseInt(part, 10)),
          model: [family, version, ...variants].join(' '),
        },
      });
    }
  }
  found.sort((a, b) => a.at - b.at || b.end - a.end);
  // A match inside an earlier one is part of that model's name.
  return found.filter((f, i) => !found.slice(0, i).some((g) => f.at < g.end)).map((f) => f.release);
}

// The model a title is about: the first it names, if of a known line.
export function modelRelease(title: string | null | undefined): ModelRelease | undefined {
  return modelReleases(title)[0];
}

// Negative when a is the earlier version, 0 when the same.
export function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}
