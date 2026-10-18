import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { type MusicRankingEntry } from '../../src/lib/music';

const REPO = process.cwd();
const catalogJsonPath = path.resolve(REPO, 'src/lib/musicCatalog.json');
const pinIdsPath = path.resolve(REPO, 'scripts/music/musicPinIds.json');

function sqlEscape(str: string): string {
  return str.replace(/'/g, "''");
}

export async function main() {
  const catalog: MusicRankingEntry[] = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf8'));
  const pinIds: Record<string, number> = JSON.parse(fs.readFileSync(pinIdsPath, 'utf8'));

  console.log(`Generating SQL update for ${catalog.length} catalog tracks...`);

  const statements: string[] = ['BEGIN;'];

  let updatedTitles = 0;
  for (const song of catalog) {
    const pinId = pinIds[song.id];
    if (!pinId) {
      console.warn(`Missing pin ID for ${song.id}`);
      continue;
    }

    // 1. Update Medium
    statements.push(`
      UPDATE "Medium"
      SET "originalUrl" = '${sqlEscape(song.artworkUrl)}',
          "thumbName" = NULL,
          "originalWidth" = 600,
          "originalHeight" = 600
      WHERE id = (
        SELECT "mediumId" FROM "PinMedium"
        WHERE "pinId" = ${pinId} AND "utcDeletedDateTime" IS NULL
        LIMIT 1
      );
    `.trim());

    // 2. Update Pin title / productName if Taiwan title was cleaned
    if (song.id.startsWith('tw-')) {
      const pinTitle = `${song.artist} — "${song.title}" (${song.chartName} #${song.rank} ${song.year})`;
      statements.push(`
        UPDATE "Pin"
        SET "title" = '${sqlEscape(pinTitle)}',
            "productName" = '${sqlEscape(song.title)}'
        WHERE id = ${pinId};
      `.trim());
      updatedTitles++;
    }
  }

  statements.push('COMMIT;');

  const sql = statements.join('\n\n') + '\n';
  const sqlFile = path.join(REPO, '.scrape', 'sync_all_covers.sql');
  fs.writeFileSync(sqlFile, sql);
  console.log(`Wrote SQL to ${sqlFile} (${statements.length} statements, updated ${updatedTitles} titles).`);

  console.log('Applying SQL transaction to production database...');
  execSync(
    `ssh -i "$HOME/.ssh/chronopin_azure" azureuser@20.109.175.187 'docker exec -i docker-postgres-1 psql -U chronopin -d chronopin' < ${sqlFile}`,
    { stdio: 'inherit' }
  );

  console.log('Successfully applied all cover art and title updates to production database!');
}

main().catch(console.error);
