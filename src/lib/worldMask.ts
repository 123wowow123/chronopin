// The world as a coarse land mask (Natural Earth 110m, equirectangular, 2 degrees a cell, longitude -180..180 and latitude 84..-58, land grown one cell
// so a word cloud has room), one run-length row per string: "#" land, "." sea, a number the run when over one. Drawn as a cloud's outline (WordCloud shape).
const ROWS = [
  '.41#44.13#6.8#3.20#5.40',
  '.36#49.9#10.8#3.20#9.36',
  '.28#57.9#10.8#3.5#5.10#12.33',
  '.27#55.12#10.13#8.7#16.10#8.14',
  '.26#56.14#7.12#12.2#27.2#8.14',
  '#2.6#9.9#31.2#22.20#5.9#56.7#2',
  '#2.4#52.3#20.16#13.#3.#65',
  '#60.#19.#3.11#85',
  '#60.2#22.10#86',
  '#60.2#13.2#7.8#88',
  '#60.2#10.5#7.7#89',
  '.6#54.3#7.9#3.4#3.2#89',
  '.6#41.3#10.4#6.16#4.#87.2',
  '.7#9.3#43.23#88.7',
  '.7#8.7#41.21#79.3#7.7',
  '.7#4.11#41.21#79.3#6.8',
  '.22#43.19#79.4#4.9',
  '.25#40.21#77.4#3.10',
  '.26#39.22#76.17',
  '.26#39.19#80.16',
  '.26#35.23#80.16',
  '.26#30.28#80.16',
  '.27#29.28#72.#5.18',
  '.27#27.30#78.18',
  '.28#25.31#78.18',
  '.28#25.31#77.19',
  '.30#22.31#69.2#5.21',
  '.30#21.31#70.2#3.23',
  '.31#15.#4.30#71.28',
  '.32#11.4#5.29#71.28',
  '.33#10.#10.26#72.28',
  '.11#3.20#24.22#41.2#29.28',
  '.11#3.22#12.#9.22#41.3#23.2#3.28',
  '.11#3.22#22.22#40.5#9.2#11.2#3.28',
  '.38#12.30#39.6#8.3#10.3#4.27',
  '.42#8.#10.19#37.9#5.7#8.3#5.26',
  '.44#17.19#37.9#6.6#8.4#4.26',
  '.46#16.19#36.10#5.6#8.4#5.25',
  '.47#18.17#35.10#5.5#7.2#9.25',
  '.48#18.17#33.13#3.5#6.2#10.25',
  '.49#17.18#32.21#19.24',
  '.48#21.24#22.22#21.22',
  '.48#24.21#20.25#25.17',
  '.48#25.20#19.27#29.12',
  '.48#26.20#17.28#29.12',
  '.48#26.21#16.29#14.2#12.#3.8',
  '.49#25.21#17.30#7.2#3.4#8.3#3.8',
  '.49#25.21#17.#3.29#4.2#15.3#3.8',
  '.50#23.22#22.34#13.16',
  '.50#22.23#22.33#14.14#2',
  '.51#21.23#22.32#16.13#2',
  '.52#20.23#21.31#19.5#3.4#2',
  '.54#17.24#14.#6.30#21.4#3.6',
  '.53#18.24#14.#6.30#22.3#3.6',
  '.53#17.26#13.#5.31#22.12',
  '.53#15.28#13.2#4.31#22.12',
  '.53#14.29#12.38#22.12',
  '.53#14.30#10.39#22.12',
  '.53#13.32#8.40#22.7#3.2',
  '.52#13.33#7.42#7.2#11.8#4.',
  '.52#12.34#4.45#4.6#10.8#5',
  '.52#11.96#7.9#5',
  '.52#10.98#5.9#6',
  '.51#9.101#4.7#7.',
  '.51#8.102#4.7#6.2',
  '.51#8.64#3.46#5.3',
  '.51#7.#3.61#3.47#3.4',
  '.51#7.#3.61#3.54',
  '.51#7.#3.118',
  '.51#7.122',
  '.53#5.122',
];

const GRID = ROWS.map((row) => {
  let out = '';
  for (const [, char, count] of row.matchAll(/([#.])(\d*)/g)) out += char.repeat(count ? Number(count) : 1);
  return out;
});

// The land as one SVG path of unit cells (viewBox 0 0 WORLD_COLS WORLD_ROWS), a rectangle for each run of land in a row.
export const WORLD_COLS = GRID[0].length;
export const WORLD_ROWS = GRID.length;
export const WORLD_LAND_PATH = GRID.map((row, y) => [...row.matchAll(/#+/g)].map((run) => `M${run.index} ${y}h${run[0].length}v1h-${run[0].length}z`).join('')).join('');

// Where a latitude and longitude fall in the map's box, as fractions of its width and height.
export function worldPoint(lat: number, lon: number) {
  return { x: Math.min(1, Math.max(0, (lon + 180) / 360)), y: Math.min(1, Math.max(0, (84 - lat) / 142)) };
}

export const WORLD_ASPECT = GRID[0].length / GRID.length;

// Whether (x, y) in a width x height box falls on land.
export function worldShape(width: number, height: number) {
  return (x: number, y: number) => GRID[Math.min(GRID.length - 1, Math.floor((y / height) * GRID.length))]?.[Math.min(GRID[0].length - 1, Math.floor((x / width) * GRID[0].length))] === '#';
}
