// Gap pass 2026-11-25: Lima mayoral candidates (pin 5173) from El Peruano interview photos + Commons.
import { outcomePhotosForPin, outcomeKey, savePhotosPartial, type PhotoInput } from '../../src/server/model/pinOutcomePhoto';
import * as db from '../../src/server/db';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ep = (label: string, img: string, article: string): PhotoInput => ({ label, person: label, kind: 'person', imageSource: `https://elperuano.pe/fotografia/thumbnail/${img}.jpg`, authorName: 'El Peruano (candidate interview)', authorUrl: `https://elperuano.pe/noticia/${article}` });
const rows: PhotoInput[] = [
  ep('Samuel Marcos Daza Taype', '2026/09/10/000393326M', '304403-samuel-daza-taype-vamos-a-implementar-mil-unidades-tacticas-en-lima'),
  ep('Edgardo Renán De Pomar Vizcarra', '2026/09/18/000394103M', '304979-edgardo-de-pomar-propongo-uso-de-armas-de-fuego-para-el-serenazgo-metropolitano'),
  ep('Rubén Daniel Bonilla Espinoza', '2026/09/25/000394766M', '305464-ruben-bonilla-espinoza-necesitamos-ejecutar-con-urgencia-el-plan-vigila-lima'),
  ep('Santiago Rosendo Abarca León', '2026/09/22/000394416M', '305215-santiago-abarca-el-gran-proyecto-es-hacer-el-malecon-del-rio-rimac'),
  ep('Luis Alberto Huette Tolentino', '2026/09/20/000394259M', '305095-luis-huette-impulsaremos-el-tren-subterraneo-de-ancon-a-punta-hermosa'),
  { label: 'Francis James Allison Oyague', person: 'Francis James Allison Oyague', kind: 'person', imageSource: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Francis_Allison.jpg', authorName: 'Wikimedia Commons, Francis_Allison.jpg', authorUrl: 'https://es.wikipedia.org/wiki/Francis_Allison' },
  { label: 'Ricardo Pablo Belmont Cassinelli', person: 'Ricardo Pablo Belmont Cassinelli', kind: 'person', imageSource: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Ricardo_Belmont.png', authorName: 'Wikimedia Commons, Ricardo_Belmont.png', authorUrl: 'https://es.wikipedia.org/wiki/Ricardo_Belmont' },
];
for (const row of rows) {
  if ((await outcomePhotosForPin(5173)).some((p) => outcomeKey(p.label) === outcomeKey(row.label))) continue;
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await savePhotosPartial(5173, [row]);
    const err = JSON.stringify(r.failed);
    console.log(row.label, r.saved.length ? 'ok ' + r.saved[0].imageUrl : 'FAILED ' + err.slice(0, 160));
    if (r.saved.length || !/429/.test(err)) break;
    await sleep(660000);
  }
  if (row.imageSource!.includes('wikimedia')) await sleep(45000);
}
await db.closeConnection(); process.exit(0);
