import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { type MusicRankingEntry } from '../../src/lib/music';

const REPO = process.cwd();
const catalogJsonPath = path.join(REPO, 'src/lib/musicCatalog.json');
const catalogTsPath = path.join(REPO, 'src/lib/musicCatalog.ts');
const pinIdsPath = path.join(REPO, 'scripts/music/musicPinIds.json');

function sqlEscape(str: string): string {
  return str.replace(/'/g, "''");
}

export async function main() {
  console.log('--- Fixing Broken sourceUrls across Music Catalog & Production Pins ---');

  const catalog: MusicRankingEntry[] = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf8'));
  const pinIds: Record<string, number> = JSON.parse(fs.readFileSync(pinIdsPath, 'utf8'));

  const fixes: Array<{ id: string; pinId: number; title: string; oldUrl: string; newUrl: string }> = [];

  for (const track of catalog) {
    const pinId = pinIds[track.id];
    const oldUrl = track.sourceUrl;
    let newUrl: string | null = null;

    // 1. Billboard Japan
    if (oldUrl.includes('billboard-japan.com')) {
      if (oldUrl.includes('detail?kind=year_2023')) {
        newUrl = 'https://www.billboard-japan.com/charts/detail?a=hot100_year&year=2024';
      } else if (oldUrl.includes('detail?kind=year')) {
        newUrl = 'https://www.billboard-japan.com/charts/detail?a=hot100_year&year=2025';
      } else if (oldUrl.includes('detail?kind=jsingle')) {
        newUrl = 'https://www.billboard-japan.com/charts/detail?a=hot100';
      } else if (oldUrl === 'https://www.billboard-japan.com/charts/') {
        newUrl = 'https://www.billboard-japan.com/charts/detail?a=hot100#jp-2026-2';
      }
    }

    // 2. Argentina Billboard
    else if (oldUrl.includes('billboard.com/charts/argentina-hot-100')) {
      newUrl = 'https://billboard.com.ar/hot-100/';
    }

    // 3. South Africa
    else if (oldUrl.includes('theofficialsacharts.co.za')) {
      newUrl = 'https://risa.org.za/';
    }

    // 4. Mexico
    else if (
      oldUrl.includes('monitorlatino.com/top-100-mexico') ||
      oldUrl.includes('amprofon.com.mx/es/pages/top-anual.php')
    ) {
      newUrl = 'https://monitorlatino.com/';
    }

    // 5. Brazil
    else if (
      oldUrl.includes('pro-musicabr.org.br/top-100') ||
      oldUrl.includes('pro-musicabr.org.br/top-anual')
    ) {
      newUrl = 'https://pro-musicabr.org.br/';
    }

    // 6. Colombia
    else if (oldUrl.includes('monitorlatino.com/top-colombia')) {
      newUrl = 'https://monitorlatino.com/';
    }

    // 7. Spain
    else if (oldUrl.includes('promusicae.es/listas/')) {
      newUrl = 'https://www.promusicae.es/';
    }

    // 8. Germany
    else if (oldUrl.includes('offiziellecharts.de/jahrescharts')) {
      newUrl = 'https://www.offiziellecharts.de/charts/single';
    }

    // 9. South Korea
    else if (oldUrl.includes('circlechart.kr/page_chart/onoff.circle') && !oldUrl.includes('serviceGbn')) {
      newUrl = 'https://circlechart.kr/page_chart/onoff.circle?serviceGbn=ALL';
    } else if (oldUrl.includes('circlechart.kr/page_chart/year.circle')) {
      newUrl = 'https://circlechart.kr/';
    }

    // 10. Singapore
    else if (oldUrl.includes('rias.org.sg/chart-archive')) {
      newUrl = 'https://www.rias.org.sg/the-official-singapore-chart/';
    }

    // 11. Taiwan
    else if (oldUrl.includes('kchart.kkbox.com')) {
      newUrl = 'https://www.kkbox.com/';
    }

    // 12. Turntable Nigeria
    else if (oldUrl.includes('turntablecharts.com/year-end')) {
      newUrl = 'https://www.turntablecharts.com/charts/1';
    }

    if (newUrl && newUrl !== oldUrl) {
      track.sourceUrl = newUrl;
      if (pinId) {
        fixes.push({
          id: track.id,
          pinId,
          title: track.title,
          oldUrl,
          newUrl,
        });
      }
    }
  }

  console.log(`Found ${fixes.length} tracks with broken sourceUrls to fix:`);
  for (const f of fixes) {
    console.log(`  [Pin #${f.pinId} - ${f.id}] ${f.title}: ${f.oldUrl} -> ${f.newUrl}`);
  }

  // Update src/lib/musicCatalog.json
  fs.writeFileSync(catalogJsonPath, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`Updated ${catalogJsonPath}`);

  // Update src/lib/musicCatalog.ts
  const tsContent = `import { type MusicRankingEntry } from './music';\n\nexport const RAW_SEED_MUSIC_RANKINGS: MusicRankingEntry[] = ${JSON.stringify(catalog, null, 2)};\n`;
  fs.writeFileSync(catalogTsPath, tsContent);
  console.log(`Updated ${catalogTsPath}`);

  // Build production SQL transaction
  const statements: string[] = ['BEGIN;'];

  for (const f of fixes) {
    statements.push(`
      UPDATE "Pin"
      SET "sourceUrl" = '${sqlEscape(f.newUrl)}'
      WHERE id = ${f.pinId};

      UPDATE "PinReference"
      SET "url" = '${sqlEscape(f.newUrl)}'
      WHERE "pinId" = ${f.pinId};
    `.trim());
  }

  statements.push('COMMIT;');

  const sql = statements.join('\n\n') + '\n';
  const sqlFile = path.join(REPO, '.scrape', 'fix_source_urls.sql');
  fs.writeFileSync(sqlFile, sql);
  console.log(`Wrote SQL to ${sqlFile} (${fixes.length} pin updates)`);

  console.log('Applying SQL transaction to production database...');
  execSync(
    `ssh -i "$HOME/.ssh/chronopin_azure" azureuser@20.109.175.187 'docker exec -i docker-postgres-1 psql -U chronopin -d chronopin' < ${sqlFile}`,
    { stdio: 'inherit' }
  );

  console.log('Successfully applied all sourceUrl updates to production database!');
}

main().catch(console.error);
