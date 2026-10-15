import * as db from '@/server/db';
import {
  detectScript,
  extractWorkTitle,
  isAlternateTag,
  labelForLocale,
  sortAlternateNames,
  type AlternateNameJson,
} from '@/lib/alternateNames';

export async function alternateNamesForPin(pinId: number): Promise<AlternateNameJson[]> {
  const [pin] = await db.query<{ id: number; title: string; productName: string | null; company: string | null }>(
    `SELECT p.id, p.title, p."productName", c.name AS company
     FROM "Pin" p
     LEFT JOIN "Company" c ON c.id = p."companyId"
     WHERE p.id = $1 AND p."utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  if (!pin) return [];

  const [tags, translations] = await Promise.all([
    db.query<{ name: string; kind: string; source: string }>(
      `SELECT name, kind, source FROM "PinTag" WHERE "pinId" = $1`,
      [pinId],
    ),
    db.query<{ locale: string; title: string }>(
      `SELECT locale, title FROM "PinTranslation" WHERE "pinId" = $1 AND title IS NOT NULL AND btrim(title) <> ''`,
      [pinId],
    ),
  ]);

  const map = new Map<string, AlternateNameJson>();

  // 1. Tags
  for (const t of tags) {
    if (t.kind === 'category' || t.kind === 'award' || t.kind === 'nomination' || t.kind === 'reserved') continue;
    const name = t.name.trim();
    if (!name) continue;
    if (!isAlternateTag(name, pin.title, pin.productName, pin.company)) continue;

    const detected = detectScript(name);
    map.set(name.toLowerCase(), {
      name,
      label: detected.label,
      script: detected.script,
      source: 'tag',
    });
  }

  // 2. Translations
  for (const tr of translations) {
    const extracted = extractWorkTitle(tr.title);
    if (!extracted) continue;
    if (extracted.toLowerCase() === pin.title.trim().toLowerCase()) continue;
    if (pin.productName && extracted.toLowerCase() === pin.productName.trim().toLowerCase()) continue;

    const key = extracted.toLowerCase();
    if (!map.has(key)) {
      const detected = detectScript(extracted);
      const localeLabel = labelForLocale(tr.locale);
      map.set(key, {
        name: extracted,
        label: localeLabel ?? detected.label,
        script: detected.script,
        locale: tr.locale,
        source: 'translation',
      });
    }
  }

  // 3. productName
  if (pin.productName) {
    const cleanProduct = pin.productName.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (cleanProduct && cleanProduct.toLowerCase() !== pin.title.trim().toLowerCase()) {
      const key = cleanProduct.toLowerCase();
      if (!map.has(key)) {
        const detected = detectScript(cleanProduct);
        map.set(key, {
          name: cleanProduct,
          label: detected.label === 'Alias' ? 'English' : detected.label,
          script: detected.script,
          source: 'product',
        });
      }
    }
  }

  return sortAlternateNames(Array.from(map.values()));
}

