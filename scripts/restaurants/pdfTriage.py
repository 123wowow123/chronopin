"""Run from a working dir that holds prod-live.json (fresh /api/admin/restaurant-content + restaurant-specials listing) and pydeps/ (PyMuPDF): downloads every PDF menu URL that still has gap lines (honest User-Agent, 1.2 s pause) and writes triage.json with embedded-photo counts per PDF."""
import json,sys,os,hashlib,subprocess,time,collections,warnings;warnings.filterwarnings('ignore')
sys.path.insert(0,'pydeps')
import pymupdf as fitz
d0=json.load(open('prod-live.json'));c=collections.defaultdict(lambda:[0,set()])
for kind in ('content','specials'):
    for r in d0[kind]:
        p=r['profile'];mp=p.get('menu') if kind=='content' else p
        if not mp:continue
        for m in mp.get('menus') or []:
            u=m.get('url') or ''
            if '.pdf' in u.lower():
                g=sum(1 for i in m['items'] if not(i.get('image') or i.get('images')))
                if g:c[u][0]+=g;c[u][1].add((mp.get('name') or '')[:28])
res={}
for u,(g,n) in sorted(c.items(),key=lambda x:-x[1][0]):
    f='pdfs/'+hashlib.md5(u.encode()).hexdigest()[:12]+'.pdf'
    if not os.path.exists(f):
        r=subprocess.run(['curl','-sL','--max-time','90','--max-filesize','40000000','-A','ChronopinResearch/1.0 (restaurant menu photo research)','-o',f,'-w','%{http_code}',u],capture_output=True,text=True).stdout
        time.sleep(1.2)
    else:r='cached'
    info={'url':u,'gaps':g,'recs':len(n),'http':r,'file':f}
    try:
        d=fitz.open(f);big=0;pages=set()
        masks=set(x[1] for pg in d for x in pg.get_images(full=True) if x[1])
        for i,pg in enumerate(d):
            for x in pg.get_images(full=True):
                if x[0] not in masks and x[2]>=300 and x[3]>=200:big+=1;pages.add(i+1)
        info.update(pages=len(d),photos=big,photopages=sorted(pages)[:12])
    except Exception as e:info['err']=str(e)[:50]
    res[u]=info;json.dump(res,open('triage.json','w'),ensure_ascii=False)
print('done',len(res))
