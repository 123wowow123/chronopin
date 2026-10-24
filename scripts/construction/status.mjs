// Apply reviewed construction statuses without rewriting pin text or authors.
// Run: node --env-file=.env.local scripts/construction/status.mjs
import fs from 'node:fs/promises';
const path=process.argv.includes('--manifest')?process.argv[process.argv.indexOf('--manifest')+1]:'scripts/construction/status.json';
const report=JSON.parse(await fs.readFile(path,'utf8'));
const statuses=['Proposed','In Progress','Completed'];
for(const env of report.environments.filter(e=>!process.argv.includes('--production-only')||e.base.startsWith('https:'))){
 let token;
 const base=env.base==='https://www.chronopin.com'?(process.env.PRODUCTION_API_TRANSPORT||env.base):env.base;
 const call=async(method,route,body)=>{
  const res=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const t=await res.text();let d;try{d=JSON.parse(t)}catch{d=t}
  if(!res.ok)throw Error(`${env.base} ${method} ${route}: ${res.status} ${JSON.stringify(d).slice(0,300)}`);return d;
 };
 ({token}=await call('POST','/auth/local',{email:process.env.ADMIN_EMAIL||'flynni2008@gmail.com',password:process.env.ADMIN_PASSWORD}));
 for(let offset=0;offset<env.pins.length;offset+=80){
 const pins=env.pins.slice(offset,offset+80),ids=pins.map(p=>p.id),filter=ids.join(',');
 const readTags=async()=>{let rows=[],total=Infinity;for(let offset=0;offset<total;offset+=1000){const page=await call('GET',`/api/admin/db/PinTag?pinId.in=${filter}&limit=1000&offset=${offset}`);rows.push(...page.rows);total=page.total}return rows};
 const {rows:before}=await call('GET',`/api/admin/db/Pin?id.in=${filter}&limit=1000`);
 if(before.length!==ids.length)throw Error('Missing or duplicate identities');
 for(const p of pins){if(!statuses.includes(p.status)||before.find(x=>x.id===p.id)?.title!==p.title||(p.expectedAuthorId!=null&&before.find(x=>x.id===p.id)?.userId!==p.expectedAuthorId))throw Error('Identity/status mismatch '+p.id)}
 const tags=await readTags();
 await fs.mkdir('.scrape/construction-status-2026-10-24',{recursive:true});
 await fs.writeFile(`.scrape/construction-status-2026-10-24/${new URL(env.base).hostname}-${path.split('/').pop().replace(/\.json$/,'')}-${offset}-before.json`,JSON.stringify({pins:before,tags},null,2),{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e});
 // Remove only contradictory status tags; all unrelated metadata survives.
 const stale=tags.filter(t=>statuses.some(s=>s.toLowerCase()===t.name.toLowerCase())&&pins.find(p=>p.id===t.pinId).status!==t.name);
 if(stale.length)await call('DELETE',`/api/admin/db/PinTag?id.in=${stale.map(t=>t.id).join(',')}`);
 const wanted=pins.filter(p=>!tags.some(t=>t.pinId===p.id&&t.name===p.status)).map(p=>({pinId:p.id,name:p.status,kind:'topic',source:'user'}));
 if(wanted.length)await call('POST','/api/admin/db/PinTag',wanted);
 const [{rows:after},saved]=await Promise.all([call('GET',`/api/admin/db/Pin?id.in=${filter}&limit=1000`),readTags()]);
 for(const p of pins){
  const a=after.find(x=>x.id===p.id),b=before.find(x=>x.id===p.id),ts=saved.filter(t=>t.pinId===p.id&&statuses.some(s=>s.toLowerCase()===t.name.toLowerCase()));
  if(ts.length!==1||ts[0].name!==p.status||a.userId!==b.userId||a.parentId!==b.parentId||a.title!==b.title||a.longFormSummary!==b.longFormSummary)throw Error('Verification failed '+p.id);
  for(const t of tags.filter(t=>t.pinId===p.id&&!statuses.some(s=>s.toLowerCase()===t.name.toLowerCase())))if(!saved.some(s=>s.id===t.id))throw Error('Unrelated tag changed '+t.id);
  p.verified=true;
 }
 env.verifiedCount=env.pins.filter(p=>p.verified).length;console.log(env.base,offset+pins.length,'/',env.pins.length,'verified');
 await fs.writeFile(path,JSON.stringify(report,null,2)+'\n');
 }
 env.counts=Object.fromEntries(statuses.map(s=>[s,env.pins.filter(p=>p.status===s).length]));
 await fs.writeFile(path,JSON.stringify(report,null,2)+'\n');console.log(env.base,JSON.stringify(env.counts),env.verifiedCount,'verified');
}
