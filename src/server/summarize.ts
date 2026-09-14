import type { Row } from './db';

// TODO: a stub, as in the Express app. A real long-form summary needs the
// page body text, which only the scraper has; scraped pins already get one
// from ./extract. Output format when implemented: an HTML bulleted list
// ('<ul><li>...</li></ul>'), rendered as HTML on the pin page.
export async function generateSummary(_pin: Row): Promise<string | null> {
  return null;
}
