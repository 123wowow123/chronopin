// Run with node --env-file=.env.local scripts/power/threeMileIslandGeneration.mjs.
// Also invoked after the thread seed, so replays retain native generation data.
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function enrichThreeMileIslandGeneration() {
  const path='docs/research/three-mile-island-thread-2026-10-24.json';
  const report=JSON.parse(await fs.readFile(path,'utf8'));
  const u1=report.sources.unit1[0],u2=report.sources.unit2[0],operator=report.sources.operator[0];
  const profiles={
    opening:{megawatts:792,sourceUrl:u1,note:'Unit 1: 1974 reference net electrical rating, 792 MWe (WNA/IAEA PRIS historical table). Calendar-1974 electricity supplied: 2,450.20 GWh. Historical capacity, not current output.',detail:'Unit 1’s 1974 reference net electrical rating was 792 MWe. Reported electricity supplied in calendar 1974 was 2,450.20 GWh; this is annual energy, distinct from the MW capacity rating.'},
    unit2:{megawatts:880,sourceUrl:u2,note:'Unit 2: 880 MWe net; 959 MWe gross. Calendar-1978 electricity supplied: 636.50 GWh. Permanent shutdown March 28, 1979. Historical rating, not present generation.',detail:'Unit 2 had 880 MWe net electrical capacity (959 MWe gross). Reported calendar-1978 electricity supplied was 636.50 GWh. These are Unit 2 figures, separate from Unit 1.'},
    accident:{megawatts:880,sourceUrl:u2,note:'Unit 2 historical pre-accident rating: 880 MWe net, 959 MWe gross. Permanently shut March 28, 1979; no ongoing generation. Calendar-1979 electricity supplied before closure: 1,318.10 GWh.',detail:'Before its permanent shutdown, Unit 2 was rated at 880 MWe net (959 MWe gross). The historical table records 1,318.10 GWh supplied in calendar 1979. The accident ended its generating operation; the capacity badge describes the former unit, not current production.'},
    return:{megawatts:776,sourceUrl:u1,note:'Unit 1: 1985 reference net electrical rating, 776 MWe. Calendar-1985 electricity supplied: 811.66 GWh, reflecting the late-year return. Historical rating, not the later 835 MW restart project.',detail:'The historical table lists Unit 1’s 1985 reference net electrical rating as 776 MWe and electricity supplied that calendar year as 811.66 GWh. The later Crane project’s 835 MW rating is not applied retroactively.'},
    storage:{megawatts:880,sourceUrl:u2,note:'Unit 2 former net generating capacity: 880 MWe (959 MWe gross). Permanently shut in 1979. This 1993 monitored-storage event has no operating generation; this is historical reactor capacity, not storage power.',detail:'Unit 2’s former net generating capacity was 880 MWe (959 MWe gross). By this monitored-storage milestone it had permanently stopped generating. “Storage” here means monitored custody of a damaged reactor, not electrical energy storage.'},
    closure:{megawatts:819,sourceUrl:u1,note:'Unit 1: 2019 reference net electrical rating, 819 MWe; calendar-2019 electricity supplied 5,214.02 GWh. Shutdown September 20, 2019. No generation after that closure pending an approved restart.',detail:'Unit 1’s 2019 reference net electrical rating was 819 MWe. It supplied 5,214.02 GWh during calendar 2019 before the September closure. These are historical output and capacity figures; the closed unit is not currently generating.'},
    restart:{megawatts:835,sourceUrl:operator,note:'Proposed Unit 1/Crane restart: 835 MW electrical generation capacity, per Constellation. Target 2027, subject to approvals; not operating output as of October 24, 2026. Excludes damaged Unit 2.',detail:'Constellation says the Unit 1 restoration would return 835 MW of electrical generation capacity to the grid. This is proposed restart capacity, subject to approvals and targeted for 2027; it is not current generation. Accident-damaged Unit 2 is excluded.'},
  };
  const marker='<h3>Generation information</h3>';
  for(const env of report.environments) {
    let token;
    const call=async(method,route,body)=>{
      const r=await fetch(env.base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
      const t=await r.text();let d;try{d=JSON.parse(t)}catch{d=t}
      if(!r.ok)throw Error(`${env.base} ${method} ${route}: ${r.status} ${JSON.stringify(d).slice(0,200)}`);
      return d;
    };
    ({token}=await call('POST','/auth/local',{email:process.env.ADMIN_EMAIL||'flynni2008@gmail.com',password:process.env.ADMIN_PASSWORD}));
    for(const entry of env.pins) {
      const event=report.events.find(e=>e.title===entry.title);
      const profile=profiles[event?.key]??profiles.restart;
      const p=await call('GET',`/api/pins/${entry.id}`);
      const power={megawatts:profile.megawatts,kind:'generation',sourceUrl:profile.sourceUrl,note:profile.note};
      const refs=[...p.references];
      if(!refs.some(r=>r.url===profile.sourceUrl))refs.push({url:profile.sourceUrl,title:profile.sourceUrl===operator?'Crane Clean Energy Center':profile.sourceUrl===u2?'Three Mile Island 2':'Three Mile Island 1',confidence:95,reasoning:profile.note});
      const summary=(p.longFormSummary??'').split(marker)[0]+marker+`<p>${profile.detail}<cite data-ref="${profile.sourceUrl}"></cite></p>`;
      if(p.longFormSummary!==summary||refs.length!==p.references.length) {
        const updated=await call('PUT',`/api/pins/${entry.id}?lightweight=1`,{...p,references:refs,longFormSummary:summary});
        if(updated.user.id!==p.user.id || updated.parentId!==p.parentId)throw Error('Author or thread changed');
      }
      await call('PUT',`/api/pins/${entry.id}/power`,power);
      const saved=await call('GET',`/api/pins/${entry.id}/power`);
      if(saved.megawatts!==power.megawatts||saved.kind!=='generation'||saved.sourceUrl!==power.sourceUrl||saved.note!==power.note)throw Error('Generation verification failed');
      entry.power=saved;
      console.log(env.base,entry.id,saved.megawatts,'MW generation verified');
    }
    await call('POST','/api/admin/source-wikis',{wikis:[
      {url:u1,title:'Three Mile Island 1',generatedBy:'codex/session',wiki:{title:'Three Mile Island 1',summary:'Unit 1 operating history and historical net generation ratings.',body:'Commercial operation September 2, 1974; shutdown September 20, 2019. Historical reference ratings and electricity supplied: 1974, 792 MWe and 2,450.20 GWh; 1985, 776 MWe and 811.66 GWh; 2019, 819 MWe and 5,214.02 GWh. The headline specification is 819 MWe net and 880 MWe gross.',tags:['three mile island','generation'],topics:[],lastModified:null}},
      {url:u2,title:'Three Mile Island 2',generatedBy:'codex/session',wiki:{title:'Three Mile Island 2',summary:'Unit 2 historical capacity and supplied electricity.',body:'880 MWe net; 959 MWe gross. Electricity supplied: 636.50 GWh in 1978 and 1,318.10 GWh in 1979. Commercial operation December 30, 1978; permanent shutdown March 28, 1979.',tags:['three mile island','generation'],topics:[],lastModified:null}},
    ]});
    await fs.writeFile(path,JSON.stringify(report,null,2)+'\n');
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await enrichThreeMileIslandGeneration();
