'use strict';

// TODO: this is a stub. Wire up a real LLM call (e.g. Anthropic's Claude,
// via config.anthropic.apiKey in server/config/environment) once a key is
// configured. The scraper (server/scrape/web.js) only pulls the meta
// description today, so generating an actual long-form summary will also
// need the full page body text, not just what's already captured on the
// Pin.
//
// Output format: an HTML bulleted list of key points, e.g.
// '<ul><li>...</li><li>...</li></ul>' - not a prose paragraph. It's rendered
// with ng-bind-html on the pin page (client/app/pin/pin.html), so real <ul>/
// <li> markup is what shows up as an actual list.
export function generateSummary(pin) {
  return Promise.resolve(null);
}
