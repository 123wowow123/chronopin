// Researched content maintenance. No deployment. Replay with --env-file=.env.local.
// Source evidence, costs, photos and per-event generation live in the catalog.
import fs from 'node:fs/promises';
const path='docs/research/nuclear-restart-threads-2026-10-24.json';
const report=JSON.parse(await fs.readFile(path,'utf8'));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const source=k=>{if(!report.sources[k])throw Error('Missing source '+k);return report.sources[k]};
const cite=k=>`<cite data-ref="${esc(source(k).url)}"></cite>`;
const keys=e=>[...new Set([...e.referenceKeys,e.powerSourceKey,...(e.annual?[e.annual.sourceKey]:[]),...(e.cost?[e.cost.sourceKey]:[])])];
const reference=(k,e)=>({url:source(k).url,title:source(k).title,confidence:95,reasoning:(k===e.cost?.sourceKey?`${e.cost.scope} Exact quote: “${e.cost.quote}”.`:source(k).facts).slice(0,1900),...(source(k).publishedDate?{publishedDate:source(k).publishedDate}:{}),...(k===e.sourceKey?{startDate:e.date}:{})});
const wiki=k=>({url:source(k).url,title:source(k).title,generatedBy:'codex/session',wiki:{title:source(k).title,summary:source(k).facts.slice(0,1000),body:source(k).facts,tags:['nuclear energy','nuclear restart'],lastModified:source(k).publishedDate??null,topics:[]}});
const precision=e=>e.precision==='day'?'The source explicitly dates this event.':`Only the ${e.precision} is supported. ${e.date} is a timeline anchor, not a confirmed operating day. ${e.summary}`;
const power=e=>({megawatts:e.megawatts,kind:'generation',sourceUrl:source(e.powerSourceKey).url,note:`${e.megawatts} MW electrical capacity. ${e.generationNote}${e.annual?` Calendar-${e.annual.year} electricity supplied: ${e.annual.gwh.toLocaleString('en-US',{maximumFractionDigits:2})} GWh (annual energy, not instantaneous output).`:''}`.slice(0,500)});
function summary(p,e){
 let s=`<p>${esc(e.summary)}${cite(e.sourceKey)}</p><h3>Generation information</h3><p>${esc(power(e).note)}${cite(e.powerSourceKey)}${e.annual&&e.annual.sourceKey!==e.powerSourceKey?cite(e.annual.sourceKey):''}</p>`;
 s+=e.cost?`<p>Project cost: ${e.cost.priceCurrency} ${e.cost.price.toLocaleString('en-US')}. ${esc(e.cost.scope)} Source quote: “${esc(e.cost.quote)}”. Stated currency; no foreign-exchange or inflation conversion.${cite(e.cost.sourceKey)}</p>`:`<p>Cost: not assigned. ${esc(e.costGap)}</p>`;
 if(e.precision!=='day')s+=`<p>${esc(precision(e))}</p>`;
 s+=p.media.map(m=>`<p>Photo: ${esc(m.authorName)}. ${esc(m.caption)} <a href="${esc(m.sourceUrl)}">Source and credit</a>.</p>`).join('');
 return s;
}
let saveQueue=Promise.resolve();
function saveReport(){saveQueue=saveQueue.then(()=>fs.writeFile(path,JSON.stringify(report,null,2)+'\n'));return saveQueue}
for(const base of (process.argv.includes('--production-only')?['https://www.chronopin.com']:process.argv.includes('--local-only')?['http://127.0.0.1:3000']:['http://127.0.0.1:3000','https://www.chronopin.com'])){
 let token;
 const transport=base==='https://www.chronopin.com'?(process.env.PRODUCTION_API_TRANSPORT||base):base;
 async function call(method,route,body){
  const r=await fetch(transport+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const t=await r.text();let d;try{d=JSON.parse(t)}catch{d=t}
  if(!r.ok)throw Error(`${base} ${method} ${route} ${r.status}: ${JSON.stringify(d).slice(0,500)}`);return d;
 }
 ({token}=await call('POST','/auth/local',{email:process.env.ADMIN_EMAIL||'flynni2008@gmail.com',password:process.env.ADMIN_PASSWORD}));
 let env=report.environments.find(x=>x.base===base);if(!env){env={base,threads:[]};report.environments.push(env)}
 // Read identity and URL inventories in batches, once per environment.
 const changedOnly=process.argv.includes('--changed-only');
 const groups=(a,n)=>Array.from({length:Math.ceil(a.length/n)},(_,i)=>a.slice(i*n,i*n+n));
 const titleRows=[];for(const batch of groups((changedOnly?[]:report.plants).flatMap(p=>p.events.map(e=>e.title)),20))titleRows.push(...(await call('GET',`/api/admin/db/Pin?title.in=${encodeURIComponent(batch.join(','))}&utcDeletedDateTime.null=true&limit=1000`)).rows);
 const sourceRows=[];for(const batch of groups([...new Set((changedOnly?[]:report.plants).flatMap(p=>p.events.map(e=>source(e.sourceKey).url)))],12))sourceRows.push(...(await call('GET',`/api/admin/db/Pin?sourceUrl.in=${encodeURIComponent(batch.join(','))}&utcDeletedDateTime.null=true&limit=1000`)).rows);
 async function processPlant(p){
  if(!p.media?.length)throw Error('Missing verified image '+p.key);
  let thread=env.threads.find(x=>x.key===p.key);if(!thread){thread={key:p.key,name:p.name,pins:[]};env.threads.push(thread)}
  let parentId=null;
  for(const e of p.events){
   let entry=thread.pins.find(x=>x.key===e.key),id=entry?.id??e.existingId;
   if(!id){
    const matches=titleRows.filter(x=>x.title===e.title);
    const exact=matches.filter(x=>x.utcStartDateTime.slice(0,10)===e.date);
    if(exact.length>1)throw Error('Ambiguous event '+e.title);id=exact[0]?.id;
   }
   if(changedOnly&&entry?.contentSaved&&entry.verified){parentId=id;continue}
   const ks=keys(e),references=ks.map(k=>reference(k,e));
   const values={parentId,title:e.title,description:e.summary,longFormSummary:summary(p,e),utcStartDateTime:e.date+'T00:00:00.000Z',allDay:true,allDayStated:false,dateConfidence:e.precision==='day'?'confirmed':'estimated',dateConfidenceReasoning:precision(e),price:e.cost?.price??null,priceCurrency:e.cost?.priceCurrency??null};
   let authorId;
   if(id){
    authorId=entry?.authorId;const old=!entry?.contentSaved?await call('GET',`/api/pins/${id}`):null;authorId??=old?.user.id;
    if(e.existingId&&id!==e.existingId)throw Error('Existing identity mismatch');
    if(!entry?.contentSaved){
     await fs.mkdir('.scrape/nuclear-restarts-2026-10-24',{recursive:true});
     await fs.writeFile(`.scrape/nuclear-restarts-2026-10-24/${new URL(base).hostname}-${id}-before.json`,JSON.stringify(old,null,2),{flag:'wx'}).catch(err=>{if(err.code!=='EEXIST')throw err});
     // Preserve the original author, source identity, media and unrelated references.
     const merged=[...old.references.filter(r=>!references.some(n=>n.url===r.url)),...references];
     await call('PUT',`/api/pins/${id}?lightweight=1`,{...old,...values,tags:[...new Set([...(old.tags??[]).filter(t=>t.source==='user'&&(!e.constructionStatus||!['proposed','in progress','completed'].includes(t.name.toLowerCase()))).map(t=>t.name),'Nuclear Energy','Nuclear Restart',p.name,...(e.constructionStatus?[e.constructionStatus]:[])])],media:[...old.media,...p.media.filter(m=>!old.media.some(o=>o.originalUrl===m.originalUrl)).map(({type,originalUrl,authorName,authorUrl})=>({type,originalUrl,authorName,authorUrl}))],references:merged});
    }
   }else{
    const s=source(e.sourceKey).url;
    const collisions=sourceRows.filter(x=>x.sourceUrl?.replace(/^https?:/,'')===s.replace(/^https?:/,''));
    const body={...values,sourceUrl:collisions.length?null:s,userName:p.userName??'@EnergyDesk',address:p.address,latitude:p.latitude,longitude:p.longitude,categories:['Energy'],tags:['Nuclear Energy','Nuclear Restart',p.name,...(e.constructionStatus?[e.constructionStatus]:[])],references,media:p.media.map(({type,originalUrl,authorName,authorUrl})=>({type,originalUrl,authorName,authorUrl})),sourceWikis:ks.map(wiki)};
    const result=(await call('POST','/api/admin/pins',{pins:[body]})).results[0];
    if(!result?.id)throw Error(JSON.stringify(result));id=result.id;authorId=result.userId;
    if(result.wikis?.some(x=>x.status==='error'))throw Error('Source wiki failed '+JSON.stringify(result.wikis));
    entry={key:e.key,id,kind:'created',sourceUrl:body.sourceUrl,sharedSourceWith:collisions.map(x=>x.id)};titleRows.push({id,title:e.title,utcStartDateTime:values.utcStartDateTime});if(body.sourceUrl)sourceRows.push({id,sourceUrl:body.sourceUrl});
   }
   if(!entry){entry={key:e.key,id,kind:e.existingId?'updated-existing':'reused'}}
   entry.authorId??=authorId;entry.contentSaved=true;
   if(!thread.pins.some(x=>x.key===e.key))thread.pins.push(entry);
   thread.rootId??=id;await saveReport();
   const capacity=await call('PUT',`/api/pins/${id}/power`,power(e));
   if(capacity.megawatts!==e.megawatts||capacity.kind!=='generation'||capacity.note!==power(e).note)throw Error('Native generation save verification '+id);
   entry.parentId=parentId;entry.title=e.title;entry.date=e.date;entry.power=capacity;parentId=id;
   await saveReport();console.log(base,p.key,id,e.key,'verified');
  }
  const ws=await call('POST','/api/admin/source-wikis',{wikis:[...new Set(p.events.flatMap(keys))].map(wiki),rewrite:false});
  if(ws.results?.some(x=>x.status==='error'))throw Error('Wiki error '+JSON.stringify(ws));
  const {pins}=await call('GET',`/api/pins/thread/${thread.rootId}`);
  for(const entry of thread.pins){
   const saved=pins.find(x=>x.id===entry.id),e=p.events.find(e=>e.key===entry.key);
   if(!saved)throw Error('Thread membership '+entry.id);
   if((saved.parentId??null)!==entry.parentId||saved.user.id!==entry.authorId||saved.title!==e.title||saved.utcStartDateTime.slice(0,10)!==e.date||saved.dateConfidence!==(e.precision==='day'?'confirmed':'estimated')||Number(saved.price??0)!==Number(e.cost?.price??0)||(saved.priceCurrency??null)!==(e.cost?.priceCurrency??null))throw Error('Saved thread pin verification '+entry.id);
   for(const r of keys(e).map(k=>reference(k,e)))if(!saved.references.some(x=>x.url===r.url))throw Error('Missing reference '+entry.id+' '+r.url);
   if(!saved.media.length||!saved.longFormSummary.includes('Generation information'))throw Error('Missing photo or generation prose '+entry.id);
   entry.verified=true;
  }
  thread.verifiedCount=thread.pins.length;await saveReport();console.log('THREAD',base,p.name,thread.rootId,thread.verifiedCount);
 }
 const selectedPlants=report.plants.filter(p=>!changedOnly||p.events.some(e=>!env.threads.find(t=>t.key===p.key)?.pins.find(x=>x.key===e.key)?.contentSaved));
 let next=0;await Promise.all(Array.from({length:base.includes('127.0.0.1')?1:3},async()=>{while(next<selectedPlants.length){const plant=selectedPlants[next++];await processPlant(plant)}}));
 env.verifiedCount=env.threads.reduce((n,t)=>n+t.verifiedCount,0);await saveReport();
}
