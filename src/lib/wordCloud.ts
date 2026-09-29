// Word-cloud packing in the manner of WordArt: every word is placed by the
// cells its glyphs actually ink, not its box, walking an Archimedean spiral
// out from the middle until it fits inside the shape without touching a word
// already placed. So small words tuck into the gaps between big ones.
//
// The board is a bitset, 32 cells a number, and a sprite is tested against it
// a whole number at a time (as d3-cloud does), which keeps a 200-word cloud
// well under a frame or two. Pure: the caller rasterises each word
// (src/components/timeline/WordCloud.tsx draws them on a canvas).

// A word's inked cells around its anchor, which is where the text is drawn
// from (centred, on its baseline). offX/offY are the cell of its top-left
// relative to the anchor's cell; cells is row-major, 1 where it inks.
export type Sprite = { cols: number; rows: number; offX: number; offY: number; cells: Uint8Array };

export type CloudWord = { key: string; text: string; weight: number; vertical: boolean };

// A placed word: its anchor in px and the font size it was placed at.
export type PlacedWord = CloudWord & { x: number; y: number; size: number };

export type CloudOptions = {
  width: number;
  height: number;
  // px per cell: 2 is fine enough to fill the counters of letters.
  cell: number;
  // Whether a point (px) is inside the shape.
  inside: (x: number, y: number) => boolean;
  // A word's font size (px) at this weight (0..1) and overall scale.
  sizeFor: (weight: number, scale: number) => number;
  // The word drawn at this size, as cells of `cell` px.
  sprite: (word: CloudWord, size: number) => Sprite;
  // Cells of clear space kept around each word.
  pad?: number;
  // The scales tried in turn until every word fits (default SCALES).
  scales?: number[];
};

// Words shrink by these steps until all of them fit.
export const SCALES = [1, 0.88, 0.77, 0.67, 0.58, 0.5];

// Scales from `start` down by `ratio` a step: a caller that can guess how
// big the words may be (fitScale) starts there instead of wasting tries.
export function scalesFrom(start: number, steps = 8, ratio = 0.9): number[] {
  return Array.from({ length: steps }, (_, i) => start * ratio ** i);
}

// The scale at which the words' ink, at roughly `fill` of the shape's area,
// would cover it: a first guess for layoutCloud. area(word) is a word's box
// at scale 1 (px²). Never above `cap`; pass Infinity to let a roomy shape
// grow the words past their scale-1 sizes.
export function fitScale(areas: number[], shapeArea: number, fill = 0.42, cap = 1): number {
  const total = areas.reduce((sum, a) => sum + a, 0);
  return total ? Math.min(cap, Math.sqrt((shapeArea * fill) / total)) : 1;
}

// How much of the width x height box the shape covers (px²), sampled.
export function shapeArea(width: number, height: number, inside: (x: number, y: number) => boolean, step = 8): number {
  let hits = 0;
  for (let y = step / 2; y < height; y += step) for (let x = step / 2; x < width; x += step) if (inside(x, y)) hits++;
  return hits * step * step;
}

// Words laid out biggest first, all of them if any scale fits them, else as
// many as the scale that fitted the most. Deterministic for the same input.
export function layoutCloud(words: CloudWord[], options: CloudOptions): PlacedWord[] {
  const order = [...words].sort((a, b) => b.weight - a.weight || a.key.localeCompare(b.key));
  let best: PlacedWord[] = [];
  for (const scale of options.scales ?? SCALES) {
    const placed = attempt(order, scale, options);
    if (placed.length === order.length) return placed;
    if (placed.length > best.length) best = placed;
  }
  return best;
}

function attempt(words: CloudWord[], scale: number, o: CloudOptions): PlacedWord[] {
  const W = Math.floor(o.width / o.cell);
  const H = Math.floor(o.height / o.cell);
  const board = new Board(W, H);
  // Outside the shape counts as taken.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!o.inside((x + 0.5) * o.cell, (y + 0.5) * o.cell)) board.set(x, y);
    }
  }
  const placed: PlacedWord[] = [];
  for (const word of words) {
    const size = o.sizeFor(word.weight, scale);
    const sprite = packSprite(dilate(o.sprite(word, size), o.pad ?? 1));
    const at = board.find(sprite, W / 2, H / 2, hash(word.key));
    if (!at) continue;
    board.stamp(sprite, at.x, at.y);
    placed.push({ ...word, size, x: (at.x - sprite.offX) * o.cell, y: (at.y - sprite.offY) * o.cell });
  }
  return placed;
}

/* Sprites as bit rows */

type Packed = Sprite & { words: number; bits: Uint32Array };

// A sprite grown by `pad` cells every way, so words keep a hairline apart.
export function dilate(sprite: Sprite, pad: number): Sprite {
  if (pad <= 0) return sprite;
  const cols = sprite.cols + pad * 2;
  const rows = sprite.rows + pad * 2;
  const cells = new Uint8Array(cols * rows);
  for (let y = 0; y < sprite.rows; y++) {
    for (let x = 0; x < sprite.cols; x++) {
      if (!sprite.cells[y * sprite.cols + x]) continue;
      for (let dy = 0; dy <= pad * 2; dy++) {
        for (let dx = 0; dx <= pad * 2; dx++) cells[(y + dy) * cols + x + dx] = 1;
      }
    }
  }
  return { cols, rows, offX: sprite.offX - pad, offY: sprite.offY - pad, cells };
}

// Each row as 32-cell numbers, the first cell in the top bit.
function packSprite(sprite: Sprite): Packed {
  const words = Math.ceil(sprite.cols / 32) || 1;
  const bits = new Uint32Array(sprite.rows * words);
  for (let y = 0; y < sprite.rows; y++) {
    for (let x = 0; x < sprite.cols; x++) {
      if (sprite.cells[y * sprite.cols + x]) bits[y * words + (x >> 5)] |= 1 << (31 - (x & 31));
    }
  }
  return { ...sprite, words, bits };
}

class Board {
  readonly words: number;
  readonly bits: Uint32Array;
  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.words = Math.ceil(width / 32);
    this.bits = new Uint32Array(this.words * height);
  }

  set(x: number, y: number) {
    this.bits[y * this.words + (x >> 5)] |= 1 << (31 - (x & 31));
  }

  // Calls visit(boardIndex, bits) for each board number the sprite's rows
  // cover with its top-left cell at (left, top); stops when visit says so.
  private each(s: Packed, left: number, top: number, visit: (index: number, bits: number) => boolean): boolean {
    const shift = left & 31;
    const base = left >> 5;
    for (let r = 0; r < s.rows; r++) {
      const row = (top + r) * this.words + base;
      const from = r * s.words;
      for (let k = 0; k <= s.words; k++) {
        const cur = k < s.words ? s.bits[from + k] : 0;
        const prev = k > 0 ? s.bits[from + k - 1] : 0;
        const bits = shift ? (cur >>> shift) | (prev << (32 - shift)) : cur;
        if (!bits) continue;
        if (base + k >= this.words) return false;
        if (!visit(row + k, bits)) return false;
      }
    }
    return true;
  }

  fits(s: Packed, left: number, top: number): boolean {
    if (left < 0 || top < 0 || left + s.cols > this.width || top + s.rows > this.height) return false;
    return this.each(s, left, top, (i, bits) => (this.bits[i] & bits) === 0);
  }

  stamp(s: Packed, left: number, top: number) {
    this.each(s, left, top, (i, bits) => {
      this.bits[i] |= bits;
      return true;
    });
  }

  // Where the sprite's top-left goes, walking a spiral stretched to the
  // board's shape out from (cx, cy), starting at an angle of the word's own.
  find(s: Packed, cx: number, cy: number, seed: number): { x: number; y: number } | null {
    const ratio = this.width / this.height;
    const turn = (seed % 628) / 100;
    const reach = Math.hypot(this.width, this.height) / 2;
    const midX = Math.round(s.cols / 2) + s.offX;
    const midY = Math.round(s.rows / 2) + s.offY;
    for (let t = 0; ; t += 0.08) {
      const r = t * 0.55;
      if (r > reach) return null;
      const ax = Math.round(cx + ratio * r * Math.cos(t + turn)) - midX;
      const ay = Math.round(cy + r * Math.sin(t + turn)) - midY;
      const left = ax + s.offX;
      const top = ay + s.offY;
      if (this.fits(s, left, top)) return { x: left, y: top };
    }
  }
}

/* Shape, weights and colours */

// The shape the words pack into: a squircle (|u|^5 + |v|^5 <= 1) over the
// whole box, so the cloud fills its canvas - on a tall phone as on a wide
// screen - with only the corners rounded off. A cumulus outline looked more
// like a cloud but left the corners, the top and the bottom bare.
export function cloudShape(width: number, height: number) {
  return (x: number, y: number) => Math.abs((2 * x) / width - 1) ** 5 + Math.abs((2 * y) / height - 1) ** 5 <= 1;
}

// Counts as weights between 0 and 1 on a log scale.
export function cloudWeights(counts: number[]): number[] {
  const logs = counts.map((c) => Math.log(Math.max(c, 1)));
  const lo = Math.min(...logs);
  const hi = Math.max(...logs);
  return logs.map((l) => (hi === lo ? 0.5 : (l - lo) / (hi - lo)));
}

// A stable number from a string (FNV-1a).
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// About a quarter of the words run upward, never the biggest few, which
// read best across.
export function isVertical(key: string, rank: number): boolean {
  return rank >= 3 && hash(`v:${key}`) % 4 === 0;
}

// WordArt's welcome palette, and one light enough for the dark theme.
export const LIGHT_PALETTE = ['#6f074e', '#244861', '#e242a3', '#8d4d31', '#99810c', '#d42a2a', '#3b5bdb'];
export const DARK_PALETTE = ['#f08ccf', '#8cc0e8', '#ff9bd6', '#e8a987', '#e6c65a', '#ff8a8a', '#a5b4ff'];

export function colorFor(key: string, palette: string[]): string {
  return palette[hash(`c:${key}`) % palette.length];
}
