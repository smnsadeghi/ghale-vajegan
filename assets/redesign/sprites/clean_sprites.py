import numpy as np, json, os, sys
from PIL import Image
from scipy import ndimage as ndi

UP='/mnt/user-data/uploads/'
SRC={'knight':'Gemini_Generated_Image_5xrnpn5xrnpn5xrn.jpg','enemy_w3':'Gemini_Generated_Image_gi0infgi0infgi0i.jpg',
     'enemy_w2':'Gemini_Generated_Image_nipoignipoignipo.jpg','enemy_w1':'Gemini_Generated_Image_qk8mg9qk8mg9qk8m.jpg',
     'enemy_w4':'Gemini_Generated_Image_t8z0u8t8z0u8t8z0.jpg'}
OUT='/mnt/user-data/outputs/sprites/'
os.makedirs(OUT+'frames',exist_ok=True)
INSET=12   # px inside the grid lines (native)

def process(name):
    a=np.array(Image.open(UP+SRC[name]).convert('RGB')).astype(np.int16)
    H,W,_=a.shape; cw,ch=W/4,H/4
    frames=[]
    for r in range(4):
        for c in range(4):
            x0=int(round(c*cw))+INSET; x1=int(round((c+1)*cw))-INSET
            y0=int(round(r*ch))+INSET; y1=int(round((r+1)*ch))-INSET
            cell=a[y0:y1,x0:x1].copy()
            R,G,B=cell[...,0],cell[...,1],cell[...,2]
            spill=np.minimum(R,B)-G
            core=(spill>110)&(R>140)&(B>140)
            # keep only sizable background regions (never touches small sprite bits)
            lab,n=ndi.label(core)
            if n:
                sizes=ndi.sum(core,lab,range(1,n+1))
                big=np.isin(lab,[i+1 for i,s in enumerate(sizes) if s>=12])
            else: big=core
            zone=ndi.binary_dilation(big,iterations=6)
            hsv=np.array(Image.fromarray(cell.astype(np.uint8)).convert('HSV')).astype(float)
            hue=hsv[...,0]*360/255; sat=hsv[...,1]/255
            contam=(hue>270)&(hue<340)&(sat>0.30)&(spill>18)
            fg=~big
            fg&=~(zone&contam)
            # remove tiny specks
            lab2,n2=ndi.label(fg,structure=np.ones((3,3)))
            if n2:
                s2=ndi.sum(fg,lab2,range(1,n2+1))
                keep=np.isin(lab2,[i+1 for i,s in enumerate(s2) if s>=10])
                fg&=keep
            # despill remaining edge pixels
            edge=ndi.binary_dilation(~fg,iterations=4)&fg
            sp=np.clip(spill,0,None)*edge
            cell[...,0]=np.clip(cell[...,0]-sp,0,255); cell[...,2]=np.clip(cell[...,2]-sp,0,255)
            val=hsv[...,2]/255
            gm=fg&(hue>270)&(hue<345)&(sat>0.25)&(spill>15)&(val>0.35)
            gs=np.clip(spill,0,None)*gm
            cell[...,0]=np.clip(cell[...,0]-gs,0,255); cell[...,2]=np.clip(cell[...,2]-gs,0,255)
            rgba=np.dstack([cell.astype(np.uint8),(fg*255).astype(np.uint8)])
            ys,xs=np.where(fg)
            if len(ys)==0: frames.append((rgba,None)); continue
            bb=(xs.min(),ys.min(),xs.max()+1,ys.max()+1)
            frames.append((rgba,bb))
    return frames,(int(cw),int(ch))

def layout(name,frames,cell_native):
    # common cell size from largest extents around feet anchor
    info=[]
    for rgba,bb in frames:
        if bb is None: info.append(None); continue
        x0,y0,x1,y1=bb
        fg=rgba[...,3]>0
        h=y1-y0
        low=fg[max(y0,y1-max(8,int(h*0.10))):y1]
        xs=np.where(low.any(0))[0]
        fx=(xs.min()+xs.max())/2 if len(xs) else (x0+x1)/2
        info.append((x0,y0,x1,y1,fx))
    left=max(i[4]-i[0] for i in info if i); right=max(i[2]-i[4] for i in info if i)
    height=max(i[3]-i[1] for i in info if i)
    half=int(np.ceil(max(left,right)/8)*8)+8
    cw=2*half; chh=int(np.ceil(height/8)*8)+16
    return info,cw,chh

def compose(name,factor):
    frames,cn=process(name)
    info,cw,chh=layout(name,frames,cn)
    floor=chh-8
    cells=[]
    for (rgba,bb),i in zip(frames,info):
        canvas=np.zeros((chh,cw,4),np.uint8)
        if i:
            x0,y0,x1,y1,fx=i
            crop=rgba[y0:y1,x0:x1]
            ox=int(round(cw/2-(fx-x0))); oy=floor-(y1-y0)
            ox=max(0,min(ox,cw-crop.shape[1])); oy=max(0,oy)
            canvas[oy:oy+crop.shape[0],ox:ox+crop.shape[1]]=crop
        cells.append(canvas)
    return cells,cw,chh

def down(canvas,f):
    if f==1: return canvas
    h,w,_=canvas.shape; h2,w2=h//f,w//f
    c=canvas[:h2*f,:w2*f].astype(float)
    al=(c[...,3]>0).astype(float)
    al_b=al.reshape(h2,f,w2,f).mean((1,3))
    rgb=(c[...,:3]*al[...,None]).reshape(h2,f,w2,f,3).sum((1,3))
    cnt=al.reshape(h2,f,w2,f).sum((1,3))
    rgb=rgb/np.maximum(cnt,1)[...,None]
    out=np.dstack([rgb,(al_b>=0.5)*255]).astype(np.uint8)
    out[out[...,3]==0,:3]=0
    return out

if __name__=='__main__':
    names=sys.argv[1:] or list(SRC)
    report={}
    for name in names:
        cells,cw,chh=compose(name,1)
        meta={}
        for fac,tag in ((2,'x2'),(4,'x1')):
            ds=[down(c,fac) for c in cells]
            ch2,cw2=ds[0].shape[:2]
            sheet=np.zeros((ch2*4,cw2*4,4),np.uint8)
            for k,d in enumerate(ds):
                r,c=divmod(k,4); sheet[r*ch2:(r+1)*ch2,c*cw2:(c+1)*cw2]=d
                if tag=='x2': Image.fromarray(d).save(f'{OUT}frames/{name}_r{r+1}_c{c+1}.png')
            Image.fromarray(sheet).save(f'{OUT}{name}_{tag}.png')
            Image.fromarray(sheet).save(f'{OUT}{name}_{tag}.webp',lossless=True)
            meta[tag]={'cell_w':cw2,'cell_h':ch2,'floor_y':ch2-(8//fac),'cols':4,'rows':4}
            # bg previews for x2
            if tag=='x2':
                for nm,col in (('white',(255,255,255)),('green',(0,200,0)),('black',(0,0,0))):
                    bg=Image.new('RGBA',(sheet.shape[1],sheet.shape[0]),col+(255,))
                    bg.alpha_composite(Image.fromarray(sheet)); bg.convert('RGB').save(f'/home/claude/work/{name}_prev_{nm}.png')
        # residual magenta check on x2
        sh=np.array(Image.open(f'{OUT}{name}_x2.png')).astype(int)
        op=sh[...,3]>0
        hsv=np.array(Image.fromarray(sh[...,:3].astype(np.uint8)).convert('HSV')).astype(float)
        hue=hsv[...,0]*360/255; sat=hsv[...,1]/255
        val=hsv[...,2]/255; bad=op&(hue>270)&(hue<340)&(sat>0.35)&(val>0.35)
        meta['residual_magenta_px']=int(bad.sum()); meta['opaque_px']=int(op.sum())
        json.dump(meta,open(f'{OUT}{name}_meta.json','w'),indent=1)
        report[name]=meta
    print(json.dumps(report,indent=1))
