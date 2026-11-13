// Founding-site pictures for company hub pins that only had the logo fallback (Lululemon and Xiaomi: none found).
// Files are Wikimedia Commons downloads in the session scratchpad; credits below. Local base by default.
// node scripts/company/founding-media-2026-11-08.mjs [--apply]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
const apply = process.argv.includes('--apply');
const base = process.argv.includes('--prod') ? 'https://www.chronopin.com' : 'http://localhost:3000';
const D = '/private/tmp/claude-501/-Users-ianflynn-chronopin/a9a91014-5631-4fd9-bb88-3cf13c6c5fda/scratchpad/dl2/';
const prod = process.argv.includes('--prod');
const IDS = { ags: [20951, 20976], si: [20952, 20977], n7k: [20953, 20978], c9k: [20961, 20980], meraki: [20962, 20981], sf: [20955, 20982], duo: [20956, 20983], hyper: [20957, 20984], webex: [20958, 20985], spark: [20959, 20986], appd: [20960, 20987] };
const J = (k, f, credit, src) => ({ id: IDS[k][prod ? 1 : 0], file: D + f, credit, src });
// Pictures found with Google Images and downloaded from their source sites (plain GET, honest user agent); each credit names the source.
const jobs = [
  J('ags', 'ags_2.jpg', 'designated-router.com: a Cisco AGS+ router, front', 'https://designated-router.com/wp-content/uploads/2021/09/PXL_20210902_063700944-scaled-e1630564831295-1024x654.jpg'),
  J('ags', 'ags_4.jpg', 'Science Museum Group (image smg00177881): a Cisco AGS+ router', 'https://storage.googleapis.com/gblogs-bucket/sites/40/medium_smg00177881.jpg'),
  J('si', 'si_2.jpg', 'A Cisco Silicon One chip (image via Informa Tech)', 'https://eu-images.contentstack.com/v3/assets/blt8eb3cdfc1fce5194/bltbfde419b690e522e/662119354baabfda3958bb78/cisco_20silicon_20one_20chip.png'),
  J('si', 'si_0.jpg', 'Cisco blog: the Silicon One family of devices', 'https://blogs.cisco.com/gcs/ciscoblogs/1/2022/07/Cisco-Silicon-One-A-1.jpg'),
  J('n7k', 'n7k_2.jpg', 'Techatlantix: a Cisco Nexus 7010 chassis', 'https://techatlantix.com/media/catalog/product/n/7/n7k-c7010-n7k-c7010_5mecmdjtuge03xfh.jpg'),
  J('n7k', 'n7k_0.jpg', 'Firewall.cx: cabled line cards in a Cisco Nexus 7000 chassis', 'https://www.firewall.cx/images/stories/cisco-nexus-7000-module-shutdown-replacement-removal-1L.jpg'),
  J('c9k', 'c9k_0.jpg', 'PC Connection product photo: a Cisco Catalyst 9300 switch', 'https://service.pcconnection.com/images/inhouse/D4B04447-588E-4B2D-BD2B-0E9341716D33.jpg'),
  J('c9k', 'c9k_2.jpg', 'Network Outlet product photo: a Cisco Catalyst 9300 switch', 'https://networkoutlet.com/cdn/shop/files/C9300-48S-A_1200x1200.jpg'),
  J('c9k', 'c9k_3.jpg', 'Triton Datacom product photo: a Cisco Catalyst 9300 switch', 'https://www.tritondatacom.com/cdn/shop/files/C9300-48P-E-10-front.png'),
  J('meraki', 'meraki_0.jpg', 'Telecom4Good: the Meraki dashboard listing access points', 'https://telecom4good.org/wp-content/uploads/2023/03/20-meraki-mr-configuration-mr-access-point-main-dashboard.jpg'),
  J('meraki', 'meraki_1.jpg', 'Stratus Infosystems: the Meraki dashboard map', 'https://www.stratusinfosystems.com/wp-content/uploads/2021/04/meraki-dashboard-1.jpg'),
  J('meraki', 'meraki_3.jpg', 'Hydrasat: a Cisco Meraki MR cloud-managed access point', 'https://hydrasat.com/wp-content/uploads/meraki-mr-poster-1080x675.jpg'),
  J('sf', 'sf_0.jpg', 'Christo, CC BY-SA 4.0: a Cisco Sourcefire 3D 7120 appliance', 'https://commons.wikimedia.org/wiki/File:Cisco_sourcefire_3D_7120.jpg'),
  J('sf', 'sf_1.jpg', 'Thegreatlouboutini, CC BY-SA 4.0: Martin Roesch, Sourcefire founder', 'https://commons.wikimedia.org/wiki/File:Martin_Roesch_at_Evanta_Global_CISO_Summit.jpg'),
  J('duo', 'duo_0.jpg', 'Ann Arbor USA: Duo Security co-founders in Ann Arbor', 'https://annarborusa.org/wp-content/uploads/2022/06/dugjongee-4.jpg'),
  J('duo', 'duo_2.jpg', 'Duo Security co-founders Dug Song and Jon Oberheide (image via Ann Arbor SPARK)', 'https://d3ggs9wi9hwg8r.cloudfront.net/wp-content/uploads/2025/07/28154658/dug-and-jon-2010-01-dmc_8623.jpg'),
  J('hyper', 'hyper_2.jpg', 'CIO: Cisco Hypershield', 'https://www.cio.com/wp-content/uploads/2024/08/3487824-0-56605800-1724128827-Cisco-Hypershield-1200X800.jpg'),
  J('hyper', 'hyper_0.jpg', 'Cisco blog: Hypershield global control plane over public and private cloud', 'https://blogs.cisco.com/gcs/ciscoblogs/1/2024/04/cisco_hypershield_policy_centralization_graphic.png'),
  J('webex', 'webex_0.jpg', 'CRN: a Webex meeting', 'https://www.crn.com/news/networking/media_180e4d97802b87faad2fa84ab85cc41009d217e78.jpeg'),
  J('webex', 'webex_1.jpg', 'Computerworld: Cisco Webex meeting with polling', 'https://www.computerworld.com/wp-content/uploads/2024/03/videoconferencing-review-2021-cisco-webex-polling-100893294-orig.jpg'),
  J('spark', 'spark_4.jpg', 'Zapier: Cisco Spark across laptop, tablet and phone', 'https://cdn.zapier.com/storage/photos/b8fc8173cba5ef2aab895b63b92163a2.png'),
  J('spark', 'spark_0.jpg', 'Cisco blog: Cisco Spark Room Kit', 'https://blogs.cisco.com/gcs/Cisco-Spark-Room-Kit-room-product.jpg'),
  J('appd', 'appd_1.jpg', 'Comparitech: AppDynamics topology map', 'https://cdn.comparitech.com/wp-content/uploads/2018/11/AppDynamics-Topology-Map-screenshot.jpg'),
  J('appd', 'appd_2.jpg', 'ApplicationPerformance.com: AppDynamics Business iQ conversion funnel, March 2017', 'https://blog.applicationperformance.com/content/AppDynamics/Screen%20Shot%202017-03-14%20at%2009.53.48.png'),
];
const token = fs.readFileSync(process.argv.includes('--prod') ? '.scrape/admin.token' : '.scrape/admin-local.token', 'utf8').trim();
const call = async (method, p, body) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-media/1.0', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const t = await r.text(); if (!r.ok) throw Error(`${method} ${p}: ${r.status} ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null;
};
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', 'chronopin', '--query', '[0].value', '-o', 'tsv']).toString().trim();
const container = new BlobServiceClient('https://chronopin.blob.core.windows.net', new StorageSharedKeyCredential('chronopin', key)).getContainerClient('thumb');
for (const j of jobs) {
  const jpg = await sharp(fs.readFileSync(j.file)).jpeg({ quality: 90 }).toBuffer();
  const hash = crypto.createHash('sha256').update(jpg).digest('hex').slice(0, 16);
  const blob = container.getBlockBlobClient(`company-products/${j.id}-${hash}.jpg`);
  console.log(apply ? 'apply' : 'dry', j.id, blob.url);
  if (!apply) continue;
  if (!(await blob.exists())) await blob.uploadData(jpg, { blobHTTPHeaders: { blobContentType: 'image/jpeg', blobCacheControl: 'public, max-age=31536000, immutable' } });
  const check = Buffer.from(await (await fetch(blob.url)).arrayBuffer());
  if (crypto.createHash('sha256').update(check).digest('hex').slice(0, 16) !== hash) throw Error('blob verify failed ' + j.id);
  const pin = (await call('GET', `/api/pins/${j.id}`)); const p = pin.pin ?? pin;
  const cur = (p.media ?? []).map((m) => ({ type: Number(m.type), originalUrl: m.originalUrl, ...(m.authorName ? { authorName: m.authorName } : {}), ...(m.authorUrl ? { authorUrl: m.authorUrl } : {}) }));
  await call('PUT', `/api/pins/${j.id}?lightweight=1`, { ...p, media: [...cur, { type: 1, originalUrl: blob.url, authorName: j.credit, authorUrl: j.src }] });
  const mid = (await call('GET', `/api/pins/${j.id}`)); const m = (mid.pin ?? mid).media;
  for (const x of m) if (x.originalUrl === blob.url && x.authorName !== j.credit) await call('PATCH', `/api/admin/db/Medium?id=${x.id}`, { authorName: j.credit, authorUrl: j.src });
  await call('POST', '/api/admin/pins/expire', { ids: [j.id] });
  const after = await call('GET', `/api/pins/${j.id}`); const a = after.pin ?? after;
  console.log(j.id, a.title, a.media.map((x) => [x.thumbName, x.authorName?.slice(0, 30)]));
}
