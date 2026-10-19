'use client';

// One Escape closes one thing: the most recently opened layer (a menu, panel,
// the tag cloud, the search suggestions). Layers register as they open with
// addEscape, as they would add a document keydown listener, and the press goes
// to the newest alone; it is taken from everything else listening, so the
// next press reaches the one under it.
type Layer = (event: KeyboardEvent) => void;

const layers: Layer[] = [];
let listening = false;

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !layers.length) return;
  // Also keeps a search field from clearing its own text on Escape.
  event.preventDefault();
  event.stopImmediatePropagation();
  layers[layers.length - 1](event);
}

export function addEscape(layer: Layer) {
  if (!listening) {
    document.addEventListener('keydown', onKeyDown, true);
    listening = true;
  }
  layers.push(layer);
}

export function removeEscape(layer: Layer) {
  const at = layers.lastIndexOf(layer);
  if (at !== -1) layers.splice(at, 1);
}
