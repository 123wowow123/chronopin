import json,sys,urllib.request,urllib.parse
T=open('/Users/ianflynn/chronopin/.scrape/admin.token').read().strip()
B='https://www.chronopin.com/api/admin/db/'
H={'Authorization':'Bearer '+T,'Content-Type':'application/json','User-Agent':'chronopin-admin'}
def get(path):
    return json.load(urllib.request.urlopen(urllib.request.Request(B+path,headers=H),timeout=60))
def rows(table,q):
    out=[];off=0
    while True:
        d=get(f"{table}?{q}&limit=1000&offset={off}")
        out+=d['rows']
        off+=1000
        if off>=d['total']: return out
people=rows('Person','order=id')
byname={}
for p in people: byname.setdefault(p['name'].lower(),[]).append(p['id'])
names=[p['name'] for p in people]
tags=[]
for i in range(0,len(names),25):
    chunk=names[i:i+25]
    q='name.in='+urllib.parse.quote(','.join(chunk))
    tags+=rows('PinTag',q)
print('tag rows',len(tags))
pinids=sorted({t['pinId'] for t in tags})
live=set()
for i in range(0,len(pinids),100):
    ch=pinids[i:i+100]
    for r in rows('Pin','id.in='+','.join(map(str,ch))+'&utcDeletedDateTime.null=true'): live.add(r['id'])
links={(t['pinId'],pid) for t in tags if t['pinId'] in live for pid in byname.get(t['name'].lower(),[])}
print('live pins',len(live),'links',len(links))
if '--apply' in sys.argv:
    L=sorted(links)
    for i in range(0,len(L),200):
        body=json.dumps([{'pinId':a,'personId':b} for a,b in L[i:i+200]]).encode()
        req=urllib.request.Request(B+'PinPerson?upsert=1',data=body,headers=H,method='POST')
        r=urllib.request.urlopen(req,timeout=120); print('posted',i,r.status)
