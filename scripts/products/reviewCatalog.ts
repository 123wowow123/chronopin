type CatalogIdentity = { pinSourceUrl?: string | null; sourceUrl?: string | null };

// Catalog ids can come from a different database snapshot. Prefer the pin's
// stable URL, then the legacy rubric-source URL; never match by numeric id.
export function findReviewCatalogEntry<T extends CatalogIdentity>(catalog: T[], pinSourceUrl: string, rubricSourceUrl?: string | null): T | undefined {
  const explicit = catalog.filter((row) => row.pinSourceUrl === pinSourceUrl);
  const matches = explicit.length ? explicit : catalog.filter((row) => !row.pinSourceUrl && !!rubricSourceUrl && row.sourceUrl === rubricSourceUrl);
  if (matches.length > 1) throw new Error('Ambiguous review catalog identity');
  return matches[0];
}
