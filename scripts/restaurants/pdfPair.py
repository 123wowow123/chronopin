"""python3 pdfpair.py <pdf-url-substring> outdir : pair gap item names with nearest embedded photos using the PDF text layer; writes cand.json and a numbered contact sheet."""
import sys,json,re,unicodedata,io,os,warnings;warnings.filterwarnings('ignore')
sys.path.insert(0,'pydeps')
import pymupdf as fitz
from PIL import Image,ImageDraw,ImageFont
sub,out=sys.argv[1],sys.argv[2];os.makedirs(out,exist_ok=True)
tri=json.load(open('triage.json'));v=[x for x in tri.values() if sub in x['url']][0]
d0=json.load(open('prod-live.json'))
nz=lambda s:re.sub(r'[\s　*]+','',unicodedata.normalize('NFKC',s)).lower()
gaps={}
for kind in ('content','specials'):
    for r in d0[kind]:
        p=r['profile'];mp=p.get('menu') if kind=='content' else p
        if not mp:continue
        for m in mp.get('menus') or []:
            if m.get('url')==v['url']:
                for i in m['items']:
                    if not(i.get('image') or i.get('images')) and len([j for j in m['items'] if j['name']==i['name']])==1:gaps.setdefault(nz(i['name']),[]).append((kind,r['id'],m['label'],i['name']))
doc=fitz.open(v['file']);masks=set(x[1] for pg in doc for x in pg.get_images(full=True) if x[1])
import subprocess,csv,tempfile
LANG=os.environ.get('OCRLANG','eng')
def ocr_blocks(pg):
    # fallback for outlined text: render, tesseract TSV, group words by line, return (x0,y0,x1,y1,text) in PDF points
    pix=pg.get_pixmap(dpi=200);tf=tempfile.mktemp(suffix='.png');pix.save(tf)
    t=subprocess.run(['tesseract',tf,'-','-l',LANG,'--psm','11','tsv'],capture_output=True,text=True).stdout;os.remove(tf)
    L={};sc=72/200
    for r in csv.DictReader(io.StringIO(t),delimiter='\t',quoting=csv.QUOTE_NONE):
        if not r.get('text','').strip() or float(r['conf'])<30:continue
        k=(r['block_num'],r['par_num'],r['line_num']);l=L.setdefault(k,[1e9,1e9,0,0,[]])
        x,y,w,h=[int(r[a]) for a in('left','top','width','height')];l[0]=min(l[0],x);l[1]=min(l[1],y);l[2]=max(l[2],x+w);l[3]=max(l[3],y+h);l[4].append(r['text'])
    return [(l[0]*sc,l[1]*sc,l[2]*sc,l[3]*sc,' '.join(l[4])) for l in L.values()]
cands=[]
for pi,pg in enumerate(doc):
    pa=pg.rect.width*pg.rect.height
    imgs=[i for i in pg.get_image_info(xrefs=True) if i['xref'] not in masks and i['width']>=300 and i['height']>=200 and (i['bbox'][2]-i['bbox'][0])*(i['bbox'][3]-i['bbox'][1])<0.3*pa]
    if not imgs:continue
    blocks=pg.get_text('blocks')
    if sum(len(b[4]) for b in blocks)<40:blocks=ocr_blocks(pg)
    for b in blocks:
        x0,y0,x1,y1,txt=b[:5]
        for line in txt.split('\n'):
            k=nz(line)
            if k in gaps:
                cx,cy=(x0+x1)/2,(y0+y1)/2
                def dist(i):
                    a=i['bbox'];dx=max(a[0]-x1,x0-a[2],0);dy=max(a[1]-y1,y0-a[3],0);return (dx*dx+dy*dy)**.5
                im=min(imgs,key=dist);cands.append(dict(page=pi+1,name=line.strip(),key=k,xref=im['xref'],dist=round(dist(im)),w=im['width'],h=im['height'],recs=len(gaps[k])))
seen=set();rows=[]
for c in cands:
    t=(c['key'],c['xref'])
    if t in seen:continue
    seen.add(t);rows.append(c)
try:font=ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc',13)
except Exception:font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Unicode.ttf',13)
if not rows:
    print('0 candidates for',len(gaps),'gap names');sys.exit()
W=250;cols=5;rws=(len(rows)+cols-1)//cols;S=Image.new('RGB',(W*cols,(W+34)*rws),'white');dr=ImageDraw.Draw(S)
for n,c in enumerate(rows):
    pix=fitz.Pixmap(doc,c['xref']);pix=fitz.Pixmap(fitz.csRGB,pix) if pix.colorspace is None or pix.colorspace.n!=3 else pix;im=Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB');im.save(f"{out}/{n:03d}.jpg",quality=92);c['idx']=n;t=im.copy();t.thumbnail((W-4,W-4))
    x0=(n%cols)*W;y0=(n//cols)*(W+34);S.paste(t,(x0,y0+34));dr.text((x0+2,y0+1),f"{n} {c['name'][:18]}",fill='black',font=font);dr.text((x0+2,y0+17),f"p{c['page']} d={c['dist']} {c['w']}x{c['h']} r{c['recs']}",fill='gray',font=font)
S.save(out+'/sheet.jpg');json.dump(rows,open(out+'/cand.json','w'),ensure_ascii=False,indent=1)
print(len(rows),'candidates for',len(gaps),'gap names;',S.size)
