import json,re,subprocess,sys,concurrent.futures as cf
d=json.load(open('tmp/undated.json'))
pat=[r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})',r'property="article:published_time"\s+content="(\d{4}-\d{2}-\d{2})',r'content="(\d{4}-\d{2}-\d{2})[^"]*"\s+property="article:published_time"',r'<meta[^>]+name="(?:date|pubdate|publish[-_]date)"[^>]+content="(\d{4}-\d{2}-\d{2})',r'<time[^>]+datetime="(\d{4}-\d{2}-\d{2})']
def f(o):
    try:
        h=subprocess.run(['curl','-sL','--max-time','15','-A','Mozilla/5.0',o['url']],capture_output=True,text=True).stdout
    except Exception: return None
    for p in pat:
        m=re.search(p,h)
        if m: return m.group(1)
d=[o for o in d if 'michelin' not in o['url'] and 'facebook' not in o['url']]
with cf.ThreadPoolExecutor(8) as ex: r=list(ex.map(f,d))
for o,x in zip(d,r): o['found']=x
json.dump(d,open('tmp/dated.json','w'))
print(len(d),sum(1 for o in d if o['found']))
