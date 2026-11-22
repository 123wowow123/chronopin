const fs=require('fs');const [,,pat,n,...subs]=process.argv;
for(const f of fs.readdirSync('pg')){const t=fs.readFileSync('pg/'+f,'utf8');if(subs.length&&!subs.every(s=>t.includes(s)))continue;
 const m=t.search(new RegExp(pat,'i'));console.log('##',f,t.length,'\n',m<0?'(none)':t.slice(m,m+Number(n)));}
