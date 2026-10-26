import json,re,subprocess,concurrent.futures as cf
skip=('michelin','wanderlog','theworlds50best','enprimeurclub','artificialanalysis','facebook','instagram','tiktok','threads','reddit','youtube','x.com','wikipedia','fundaysweets','partandparcel','lemon8','helloasia','totalwine','walmart','silverstream','trolley','snacksonline','productreview','paguemenos','yelp','restaurantguru','tripadvisor','91wheels','edmunds','caranddriver','ranking.net','bevx','xchuxing','flight-report','tripexpert','.pdf','deltamuseum')
d=[o for o in json.load(open('tmp/undated.json')) if not any(s in o['url'] for s in skip)]
u={o['url']:o for o in d}
P=[r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})',r'"dateCreated"\s*:\s*"(\d{4}-\d{2}-\d{2})',r'published_time"?\s*content="(\d{4}-\d{2}-\d{2})',r'itemprop="datePublished"[^>]*content="(\d{4}-\d{2}-\d{2})',r'<time[^>]+datetime="(\d{4}-\d{2}-\d{2})',r'(?i)(?:published|posted)(?: on)?[:\s]+(?:<[^>]+>\s*)*([A-Z][a-z]+ \d{1,2}, \d{4})']
def f(url):
    h=subprocess.run(['curl','-sL','--max-time','15','-A','Mozilla/5.0',url],capture_output=True).stdout.decode('utf-8','ignore')
    m=re.search(r'/(20\d\d)/(\d\d)/',url)
    for p in P:
        x=re.search(p,h)
        if x: return x.group(1)
    return None
with cf.ThreadPoolExecutor(8) as ex: r=list(ex.map(f,list(u)))
for k,v in zip(u,r): print(v,k[:100])
