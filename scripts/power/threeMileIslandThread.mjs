// Researched content maintenance; no deployment. Run with --env-file=.env.local.
// Each environment is matched by source URL; existing authors and media survive.
import fs from 'node:fs/promises';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { execFileSync } from 'node:child_process';
import { enrichThreeMileIslandGeneration } from './threeMileIslandGeneration.mjs';

const dir = '.scrape/three-mile-island-2026-10-24';
const sources = {
  unit1: ['https://world-nuclear.org/nuclear-reactor-database/details/Three-Mile-Island-1', 'Three Mile Island 1', 'Commercial operation: 2 September 1974. Permanent shutdown: 20 September 2019.'],
  unit2: ['https://world-nuclear.org/nuclear-reactor-database/details/Three-Mile-Island-2', 'Three Mile Island 2', 'Commercial operation: 30 December 1978. Permanent shutdown: 28 March 1979.'],
  costs: ['https://tmia.com/corp.historyTMI', 'A Corporate History of Three Mile Island', 'TMI-1 entered service in September 1974 for $400 million. TMI-2 construction cost $700 million.'],
  accident: ['https://www.energy.gov/ne/articles/5-facts-know-about-three-mile-island', '5 Facts to Know About Three Mile Island', 'Equipment failure and operator error caused a partial meltdown at Unit 2 on March 28, 1979; regulatory training and emergency-planning changes followed.'],
  smithsonian: ['https://americanhistory.si.edu/tmi/tmi11.htm', 'Three Mile Island: The Inside Story — Five Score Years of Nuclear Power', 'Unit 1 was permitted to return to service in October 1985. Unit 2 was placed in post-defueling monitored storage in 1993.'],
  cleanup: ['https://world-nuclear.org/information-library/safety-and-security/safety-of-plants/three-mile-island-accident', 'Three Mile Island Accident', 'Unit 1 restarted in October 1985. Unit 2 cleanup ended in December 1993 before monitored storage; this did not restore the damaged unit to operation.'],
  dep: ['https://www.pa.gov/agencies/dep/dep-regions/southcentral-regional-office/crane-clean-energy-center-ccec', 'Crane Clean Energy Center (CCEC)', 'Unit 1 shut down September 20, 2019. The planned restart applies to Unit 1 and requires regulatory reviews.'],
  announcement: ['https://www.constellationenergy.com/news/2024/Constellation-to-Launch-Crane-Clean-Energy-Center-Restoring-Jobs-and-Carbon-Free-Power-to-The-Grid.html', 'Constellation to Launch Crane Clean Energy Center, Restoring Jobs and Carbon-Free Power to The Grid', 'September 20, 2024: Constellation announced a 20-year Microsoft power agreement enabling the proposed 835 MW Unit 1 restart. The original target was 2028.'],
  capex: ['https://www.constellationenergy.com/news/2024/Constellation-Reports-Third-Quarter-2024-Results.html', 'Constellation Reports Third Quarter 2024 Results', 'The company estimated approximately $1.6 billion in capital expenditures to restart Crane.'],
  progress: ['https://investors.constellationenergy.com/news-releases/news-release-details/constellation-reports-second-quarter-2026-results', 'Constellation Reports Second Quarter 2026 Results', 'August 6, 2026: Constellation reported FERC approval for transferring capacity interconnection rights and an NRC fuel license amendment; it still targeted 2027 operations.'],
  operator: ['https://www.constellationenergy.com/about/locations/crane-clean-energy-center.html', 'Crane Clean Energy Center', 'The operator expects readiness for service in 2027, subject to approvals. Unit 1 is independent of accident-damaged Unit 2. The official photo library includes operator training photographs.'],
  loan: ['https://www.energy.gov/articles/energy-Department-closes-loan-restart-nuclear-power-plant-pennsylvania', 'Energy Department Closes Loan to Restart Nuclear Power Plant in Pennsylvania', 'November 18, 2025: DOE closed a $1 billion loan to help finance the 835 MW Crane restart, subject to licensing approvals.'],
};
const costQuote1 = 'at a cost of  $400 million';
const costQuote2 = 'TMI-2 was built at a cost to rate payers of $700 million';
const capexQuote = 'approximately $1.6 billion of cash from operations for capital expenditures necessary to restart the plant';
const ref = (key, reasoning, date, publishedDate) => ({url:sources[key][0],title:sources[key][1],confidence:95,reasoning,...(date?{startDate:date}:{}),...(publishedDate?{publishedDate}:{})});
const cite = key => `<cite data-ref="${sources[key][0]}"></cite>`;
const events = [
  {key:'opening',title:'Three Mile Island Unit 1 Begins Commercial Operation',date:'1974-09-02',source:'unit1',price:400000000,description:'Unit 1 begins commercial operation on Three Mile Island in Pennsylvania, following construction that began in 1968.',body:`<p>This is Unit 1, the reactor later renamed Crane Clean Energy Center. The reactor database distinguishes its June 1974 grid connection from its September 2 commercial start.${cite('unit1')}</p><p>Historical construction cost: USD 400 million. Three Mile Island Alert reports “${costQuote1}”; this is the original unit cost in stated dollars, without inflation or currency conversion.${cite('costs')}</p>`,refs:[ref('unit1','Commercial Operation: Monday, 2 September 1974.','1974-09-02'),ref('costs',`Historical Unit 1 construction cost quote: “${costQuote1}”.`)]},
  {key:'unit2',title:'Three Mile Island Unit 2 Begins Commercial Operation',date:'1978-12-30',source:'unit2',price:700000000,description:'Three Mile Island’s second reactor enters commercial service, less than three months before its 1979 accident.',body:`<p>The reactor database dates first grid connection to April 21, 1978 and commercial operation to December 30, 1978.${cite('unit2')}</p><p>Historical construction cost: USD 700 million. Three Mile Island Alert states “${costQuote2}”. This is construction cost, excluding subsequent cleanup.${cite('costs')}</p>`,refs:[ref('unit2','Commercial Operation: Saturday, 30 December 1978.','1978-12-30'),ref('costs',`Unit 2 construction cost quote: “${costQuote2}”.`)]},
  {key:'accident',title:'Three Mile Island Unit 2 Suffers a Partial Meltdown',date:'1979-03-28',source:'accident',description:'Equipment failures and operator errors cause inadequate core cooling and a partial meltdown in Unit 2, permanently ending that reactor’s operation.',body:`<p>A relief valve remained open while instrumentation misled operators about its state. Loss of coolant and inadequate circulation damaged the core. DOE describes subsequent changes to operator training, emergency planning and equipment requirements.${cite('accident')}</p><p>The accident damaged Unit 2. The later Crane restart project concerns the separate Unit 1 reactor.${cite('operator')}</p>`,refs:[ref('accident','DOE dates the accident March 28, 1979.','1979-03-28','2022-05-04'),ref('operator','Distinguishes the independent Unit 1 restart from damaged Unit 2.')]},
  {key:'return',title:'Three Mile Island Unit 1 Returns to Service After Six-Year Shutdown',date:'1985-10-01',estimated:true,source:'smithsonian',description:'The undamaged Unit 1 returns to service in October 1985 after extended regulatory proceedings, modifications and retraining.',body:`<p>The Smithsonian chronology places permission to return to service in October 1985; the World Nuclear Association also dates the restart to that month. Unit 1 had been shut for refueling when Unit 2’s accident occurred.${cite('smithsonian')}${cite('cleanup')}</p><p>October 1 is a month-only timeline anchor, not a verified restart day. No separate published budget for this return-to-service event was established.</p>`,refs:[ref('smithsonian','Chronology states October 1985; the exact day is not supplied.','1985-10-01'),ref('cleanup','Corroborates restart in October 1985.')]},
  {key:'storage',title:'Three Mile Island Unit 2 Enters Post-Defueling Monitored Storage',date:'1993-12-01',estimated:true,source:'cleanup',description:'Unit 2 moves into monitored storage in December 1993 after the initial accident cleanup; decommissioning remains a separate, later process.',body:`<p>The cleanup removed damaged fuel and processed contaminated water. World Nuclear Association dates the transition to post-defueling monitored storage to December 1993. Monitored storage did not mean the site was fully decommissioned or Unit 2 restored to operation.${cite('cleanup')}</p><p>December 1 represents month-level evidence; an exact transition day is not established. No construction price is assigned to this storage milestone.</p>`,refs:[ref('cleanup','Dates post-defueling monitored storage to December 1993; exact day unspecified.','1993-12-01')]},
  {key:'closure',title:'Three Mile Island Unit 1 Shuts Down for Economic Reasons',date:'2019-09-20',source:'dep',description:'Unit 1 shuts down on September 20, 2019, ending electricity generation at Three Mile Island until any future approved restart.',body:`<p>Pennsylvania DEP records September 20, 2019 as the Unit 1 shutdown date. Constellation’s later restart announcement says the retirement was economic.${cite('dep')}${cite('announcement')}</p><p>This closure was separate from the 1979 accident that permanently disabled Unit 2. The closure event has no construction price.</p>`,refs:[ref('dep','Explicitly dates Unit 1 shutdown September 20, 2019.','2019-09-20'),ref('announcement','Says Unit 1 shut for economic reasons exactly five years before September 20, 2024.','2019-09-20','2024-09-20')]},
  {key:'agreement',title:'Microsoft Deal Launches Three Mile Island Unit 1 Restart Plan',date:'2024-09-20',source:'announcement',price:1600000000,description:'Constellation announces a 20-year Microsoft power agreement and plans to restart Unit 1 as Crane Clean Energy Center, restoring about 835 MW.',body:`<p>The September 20 announcement originally targeted 2028. This pin dates the agreement and restart plan; it does not claim electricity generation resumed that day.${cite('announcement')}</p><p>Restart capital estimate: USD 1.6 billion. Constellation’s results state “${capexQuote}”. The separate USD 1 billion DOE loan is financing, not the total project cost.${cite('capex')}</p>`,refs:[ref('announcement','Announcement explicitly dated September 20, 2024.','2024-09-20','2024-09-20'),ref('capex',`Restart capex quote: “${capexQuote}”.`)]},
  {key:'progress',title:'Constellation Reports Crane Restart Interconnection and Fuel-License Milestones',date:'2026-08-06',source:'progress',price:1600000000,description:'Constellation reports FERC approval for an interconnection-rights transfer and NRC approval of a fuel-license amendment while maintaining its 2027 restart target.',body:`<p>The August 6 results report these regulatory milestones. The date here is the dated company report, not an inferred date for either individual approval. These steps do not constitute final permission to restart.${cite('progress')}</p><p>The overall Unit 1 restoration budget is USD 1.6 billion, rather than a new budget for these approvals: “${capexQuote}”.${cite('capex')}</p>`,refs:[ref('progress','Issuer results published August 6, 2026.','2026-08-06','2026-08-06'),ref('capex',`Overall restart budget, not incremental approval spending: “${capexQuote}”.`)]},
];

async function call(base, token, method, path, body) {
  const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const text=await res.text(); let data; try{data=JSON.parse(text)}catch{data=text}
  if(!res.ok) throw new Error(`${method} ${path}: ${res.status} ${JSON.stringify(data).slice(0,400)}`);
  return data;
}
const wiki = key => ({url:sources[key][0],title:sources[key][1],generatedBy:'codex/session',wiki:{title:sources[key][1],summary:sources[key][2],body:sources[key][2],tags:['three mile island','nuclear energy'],lastModified:null,topics:[]}});
await fs.mkdir(dir,{recursive:true});
const azureKey=execFileSync('az',['storage','account','keys','list','--subscription','9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5','-n','chronopin','--query','[0].value','-o','tsv'],{encoding:'utf8'}).trim();
const container=new BlobServiceClient('https://chronopin.blob.core.windows.net',new StorageSharedKeyCredential('chronopin',azureKey)).getContainerClient('thumb');
const media={};
for(const [key,file] of [['site','doe-site.png'],['training','operators.jpg']]) {
  const blob=container.getBlockBlobClient(`three-mile-island-2026-10-24-${file}`);
  await blob.uploadData(await fs.readFile(`${dir}/${file}`),{blobHTTPHeaders:{blobContentType:file.endsWith('png')?'image/png':'image/jpeg'}});
  const check=await fetch(blob.url); if(!check.ok || (await check.arrayBuffer()).byteLength<10000) throw new Error('Blob verification failed');
  media[key]={type:1,originalUrl:blob.url,authorName:key==='site'?'U.S. Department of Energy':'Constellation Energy',authorUrl:sources[key==='site'?'accident':'operator'][0]};
}
const report={checkedAt:'2026-10-24',media,sources,events,environments:[]};
for(const base of ['http://127.0.0.1:3000','https://www.chronopin.com']) {
  const {token}=await call(base,null,'POST','/auth/local',{email:process.env.ADMIN_EMAIL||'flynni2008@gmail.com',password:process.env.ADMIN_PASSWORD});
  const found=[];
  for(const term of ['Three Mile','Crane Clean','Crane Nuclear']) {
    const data=await call(base,token,'GET',`/api/admin/db/Pin?title.ilike=${encodeURIComponent('%'+term+'%')}&utcDeletedDateTime.null=true&limit=100`);
    found.push(...data.rows);
  }
  await fs.writeFile(`${dir}/${new URL(base).hostname}-before.json`,JSON.stringify(found,null,2),{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e});
  const ids={}; let parentId=null;
  const env={base,pins:[]};report.environments.push(env);
  for(const event of events) {
    // The progress report follows the already-published 2025 loan milestone.
    if(event.key==='progress') {
      const loan=found.find(p=>p.id===5958); if(!loan)throw new Error('Expected existing loan pin');
      const p=await call(base,token,'GET',`/api/pins/${loan.id}`);
      const references=[...p.references.filter(r=>r.url!==sources.capex[0]),ref('capex',`Overall restart capex, distinct from $1 billion financing: “${capexQuote}”.`)];
      await call(base,token,'PUT',`/api/pins/${p.id}?lightweight=1`,{...p,parentId,price:1600000000,priceCurrency:'USD',references,longFormSummary:p.longFormSummary+(p.longFormSummary.includes('Overall restoration budget:')?'':`<p>Overall restoration budget: USD 1.6 billion, distinct from the USD 1 billion loan. Cost evidence: “${capexQuote}”.${cite('capex')}</p>`)});
      parentId=p.id;env.pins.push({id:p.id,title:p.title,kind:'linked-existing'});
    }
    event.constructionStatus={opening:'Completed',unit2:'Completed',return:'Completed',agreement:'Proposed',progress:'In Progress'}[event.key];
    const selected=event.key==='progress'?media.training:media.site;
    const photo=`<p>Photo: ${selected.authorName}. ${event.key==='progress'?'Operator training, from the official February 2025 photo library; illustrative of restart preparation.':'Undated aerial site photograph via DOE, used as location context; not a photograph of this dated event.'} <a href="${selected.authorUrl}">Source and credit</a>.</p>`;
    const body={userName:'@EnergyDesk',parentId,title:event.title,description:event.description,sourceUrl:sources[event.source][0],longFormSummary:event.body+photo,address:'Three Mile Island, 2625 River Road, Londonderry Township, Pennsylvania, United States',latitude:40.1533018,longitude:-76.7244372,utcStartDateTime:event.date+'T00:00:00.000Z',allDay:true,allDayStated:false,dateConfidence:event.estimated?'estimated':'confirmed',dateConfidenceReasoning:event.estimated?'Only the month is verified. Day 1 is a timeline anchor, not a confirmed day.':'The cited source explicitly dates this event; the pin records the stated calendar day.',price:event.price??null,priceCurrency:event.price?'USD':null,categories:['Energy'],tags:['Three Mile Island','Nuclear Energy',...(event.constructionStatus?[event.constructionStatus]:[])],references:event.refs,media:[selected],sourceWikis:[...new Set([event.source,...event.refs.map(r=>Object.keys(sources).find(k=>sources[k][0]===r.url))])].filter(Boolean).map(wiki)};
    const existing=(await call(base,token,'GET',`/api/admin/db/Pin?sourceUrl=${encodeURIComponent(body.sourceUrl)}&userId=408&utcDeletedDateTime.null=true&limit=10`)).rows;
    let id;
    if(existing.length) {
      if(existing.length!==1 || existing[0].title!==event.title)throw new Error('Ambiguous existing event '+event.key);
      id=existing[0].id;
      const p=await call(base,token,'GET',`/api/pins/${id}`);
      if(p.media.some(m=>m.originalUrl.includes('127.0.0.1:10000'))) {
        const {sourceWikis,userName,...edit}=body;
        await call(base,token,'PUT',`/api/pins/${id}?lightweight=1`,{...p,...edit});
      }
    } else {
      const posted=await call(base,token,'POST','/api/admin/pins',{pins:[body]});
      const result=posted.results[0]; if(!result.id)throw new Error(JSON.stringify(result));id=result.id;
      if(result.wikis?.some(w=>w.status==='error'))throw new Error(JSON.stringify(result.wikis));
    }
    ids[event.key]=id;parentId=id;env.pins.push({id,title:event.title,kind:'new-event'});
    console.log(base,id,event.title);
  }
  // Keep both existing public identities, as sibling pins for the same target.
  for(const old of found.filter(p=>/Crane Clean Energy Center/.test(p.title)&&p.utcStartDateTime.startsWith('2027'))) {
    const p=await call(base,token,'GET',`/api/pins/${old.id}`);
    const references=[...p.references.filter(r=>![sources.capex[0],sources.operator[0],sources.progress[0]].includes(r.url)),ref('capex',`Restart capex quote: “${capexQuote}”.`),ref('operator','Operator targets service in 2027, subject to approvals.'),ref('progress','August 6, 2026 results maintain the 2027 target.',undefined,'2026-08-06')];
    await call(base,token,'PUT',`/api/pins/${p.id}?lightweight=1`,{...p,parentId,price:1600000000,priceCurrency:'USD',dateConfidence:'estimated',dateConfidenceReasoning:'Operator targets 2027 without an exact restart day. December 31 is a year-end timeline anchor, not a scheduled date.',longFormSummary:`<p>Constellation targets service in 2027 for the 835 MW Unit 1 reactor, subject to regulatory approvals. Unit 2 is not part of this restart.${cite('operator')}</p><p>The August 6, 2026 company update reports interconnection-rights and fuel-license progress; it does not announce a completed restart.${cite('progress')}</p><p>Overall restoration capex is USD 1.6 billion: “${capexQuote}”. The USD 1 billion DOE loan is separate financing.${cite('capex')}</p><p>December 31 is an estimated year boundary, not a confirmed operating day. Earlier 2028 inventory estimates are superseded by the operator’s 2027 target.</p>`+`<p>See this pin’s thread for the site’s operating history, Unit 2 accident and Unit 1 restart plan.</p>`,references});
    env.pins.push({id:p.id,title:p.title,kind:'updated-existing'});
  }
  const w=await call(base,token,'POST','/api/admin/source-wikis',{wikis:['capex','operator','progress','loan'].map(wiki)});
  if(w.results.some(r=>r.status==='error'))throw new Error(JSON.stringify(w));
  const {pins:thread}=await call(base,token,'GET',`/api/pins/thread/${ids.opening}`);
  await fs.writeFile(`${dir}/${new URL(base).hostname}-thread.json`,JSON.stringify(thread,null,2));
  for(const item of env.pins) {
    const p=await call(base,token,'GET',`/api/pins/${item.id}`);
    if(!thread.some(t=>t.id===p.id))throw new Error('Pin absent from thread '+p.id);
    if(item.kind!=='new-event' && p.user.id!==408)throw new Error('Author changed');
    item.parentId=p.parentId;item.date=p.utcStartDateTime;item.price=p.price??null;item.priceCurrency=p.priceCurrency??null;
  }
  env.rootId=ids.opening;env.verifiedCount=env.pins.length;
  await fs.writeFile('docs/research/three-mile-island-thread-2026-10-24.json',JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report.environments.map(e=>({base:e.base,rootId:e.rootId,verified:e.verifiedCount}))));
await enrichThreeMileIslandGeneration();
