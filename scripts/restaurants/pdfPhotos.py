"""python3 scripts/restaurants/pdfPhotos.py menu.pdf outdir pages [minw]: extract the embedded photos of a PDF menu (skipping soft-mask and shadow layers) as clean JPEGs named p<page>_x<xref>.jpg, plus a labelled contact sheet.
Needs PyMuPDF: python3 -m pip install --target .scrape/<dir>/pydeps pymupdf, then set PYDEPS=.scrape/<dir>/pydeps. Dish names in menu PDFs are often outlined (no text layer): pair photos with captions by viewing rendered pages."""
import sys,os,warnings;warnings.filterwarnings('ignore')
sys.path.insert(0,os.environ.get('PYDEPS','.scrape/menu-research-all-2026-11-13/round60/pydeps'))
import pymupdf as fitz
from PIL import Image,ImageDraw
import io
pdf,out,pages=sys.argv[1],sys.argv[2],[int(x) for x in sys.argv[3].split(',')];minw=int(sys.argv[4]) if len(sys.argv)>4 else 300
os.makedirs(out,exist_ok=True);d=fitz.open(pdf);masks=set();rows=[]
for pn in pages:
    for x in d[pn-1].get_images(full=True):masks.add(x[1]) if x[1] else None
for pn in pages:
    seen=set()
    for x in d[pn-1].get_images(full=True):
        xr=x[0]
        if xr in seen or xr in masks or x[2]<minw:continue
        seen.add(xr);e=d.extract_image(xr);im=Image.open(io.BytesIO(e['image'])).convert('RGB')
        if x[1]:  # soft mask (cutout photo): composite onto white so the patterned base layer is not left behind
            m=fitz.Pixmap(d,x[1]);mi=Image.open(io.BytesIO(m.tobytes('png'))).convert('L').resize(im.size);bg=Image.new('RGB',im.size,'white');bg.paste(im,mask=mi);im=bg
        if im.getextrema()[0][1]<30 and im.getextrema()[1][1]<30:continue
        f=f'{out}/p{pn:02d}_x{xr}.jpg';im.save(f,quality=92);rows.append((f,pn,xr,im.size))
W=230;cols=6;rws=(len(rows)+cols-1)//cols
S=Image.new('RGB',(W*cols,(W+16)*rws),'white');dr=ImageDraw.Draw(S)
for i,(f,pn,xr,sz) in enumerate(rows):
    im=Image.open(f);im.thumbnail((W-4,W-4));x0=(i%cols)*W;y0=(i//cols)*(W+16);S.paste(im,(x0,y0+16));dr.text((x0+2,y0+2),f'p{pn} x{xr} {sz[0]}x{sz[1]}',fill='black')
S.save(out+'/sheet.jpg');print(len(rows),S.size)
