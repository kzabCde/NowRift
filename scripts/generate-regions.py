"""Original Thailand-inspired fantasy production pixels. CC0; no reference-image pixels.
Native 16px tiles, 48px residents, 2x environmental scale. Pillow is regeneration-only.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import argparse, io, json, math, random

ROOT = Path(__file__).resolve().parent.parent
CHECK = argparse.ArgumentParser()
CHECK.add_argument('--check', action='store_true')
args = CHECK.parse_args()
INK = '#243337'
THEMES = {
    'north': {'wall': ['#513e36','#785843','#a17b53','#c39d68'], 'roof': ['#273f42','#3b5b58','#58756a','#a8b6a0'], 'trim':'#d6af6b','grass':['#405c4b','#526e56','#66815d','#8c9c74'],'water':['#355d65','#477c83','#6caba4','#9bc6ba'],'cloth':'#b3694e'},
    'northeast': {'wall':['#745047','#a06d51','#bf8b60','#d4b17b'],'roof':['#69463e','#8d5946','#b37851','#dfa66b'],'trim':'#e7c289','grass':['#746647','#948053','#ad965c','#c0a96b'],'water':['#435c5b','#607c70','#88a28b','#b3b99c'],'cloth':'#8c525b'},
    'central': {'wall':['#66634f','#9d9473','#c4ba96','#e6d9af'],'roof':['#483d3d','#803f3e','#af5a42','#db9561'],'trim':'#e5c67d','grass':['#3e5d48','#50744f','#6b8757','#9ca46d'],'water':['#28565b','#397579','#599a99','#9ac5b2'],'cloth':'#548a7b'},
    'south': {'wall':['#486c6b','#74a29b','#b2c5b0','#ded7b7'],'roof':['#3d5658','#4b7977','#6d9d92','#add0b2'],'trim':'#edcd8b','grass':['#315b4a','#407453','#5b905f','#8daa72'],'water':['#23566b','#327f8e','#58b2b5','#9cd8c6'],'cloth':'#cb8b5d'},
}
outputs = {}
def canvas(w,h):
    image = Image.new('RGBA',(w,h)); return image, ImageDraw.Draw(image)
def png(region,name,image):
    out = io.BytesIO(); image.save(out,format='PNG',optimize=True)
    outputs[ROOT/'public/assets/regions'/region/(name+'.png')] = out.getvalue()
def roof(image, d, polygon, palette, seed=0):
    mask = Image.new('1',image.size); ImageDraw.Draw(mask).polygon(polygon,fill=1)
    d.polygon(polygon,fill=INK); box=mask.getbbox()
    for y in range(box[1]+2,box[3]-1):
        for x in range(box[0]+1,box[2]-1):
            if mask.getpixel((x,y)):
                d.point((x,y),fill=palette[3] if y%5==1 else palette[1+(x//7+y//5+seed)%2])
    for a,b in zip(polygon,polygon[1:]+polygon[:1]): d.line((a,b),fill=palette[0],width=2)
def brick(d, box, p):
    x0,y0,x1,y1=map(int,box);d.rectangle(box,fill=p[0])
    for row,y in enumerate(range(y0+1,y1,6)):
        for x in range(x0-7*(row%2),x1,14):
            if min(x+12,x1)>max(x,x0):
                d.rectangle((max(x,x0),y,min(x+12,x1),min(y+4,y1)),fill=p[1+(row+x//14)%2])
                d.line((max(x,x0),y,min(x+11,x1),y),fill=p[3])
def window(d,x,y,p,w=14,h=18):
    d.rectangle((x-2,y-2,x+w+2,y+h+2),fill=p['wall'][0]);d.rectangle((x,y,x+w,y+h),fill='#37565b')
    d.rectangle((x+2,y+2,x+w//2-1,y+h//2),fill='#dfbd70');d.line((x+w//2,y,x+w//2,y+h),fill=p['trim']);d.line((x,y+h//2,x+w,y+h//2),fill=p['trim'])
def door(d,x,y,p,w=20,h=27):
    d.rectangle((x-3,y-3,x+w+3,y+h+3),fill=p['trim']);d.rectangle((x,y,x+w,y+h),fill='#2a3d3b')
    for xx in range(x+2,x+w,4):d.line((xx,y+2,xx,y+h),fill=p['wall'][1])
    d.rectangle((x-5,y+h,x+w+5,y+h+3),fill=p['wall'][3]);d.point((x+w-4,y+h-9),fill=p['trim'])
def lantern(d,x,y,p):
    d.line((x,y-7,x,y),fill=p['wall'][0]);d.rectangle((x-4,y,x+4,y+10),fill=INK);d.rectangle((x-3,y+2,x+3,y+8),fill='#ebbc69');d.line((x,y+1,x,y+9),fill=p['trim'])
def finial(d,x,y,p,out=1):
    d.line((x,y+9,x+out*5,y,x+out*6,y-6),fill=p['trim'],width=2);d.point((x+out*7,y-7),fill='#f0deb1')
def building(region,name,kind,width=144,height=128):
    p=THEMES[region];im,d=canvas(width,height);cx=width//2;base=height-10
    d.ellipse((7,height-19,width-6,height-3),fill='#203936')
    left,right=18,width-19;walltop=height//2;wallbottom=base-8
    if kind=='stall':
        d.rectangle((12,base-44,width-13,base),fill=p['wall'][0]);d.rectangle((15,base-42,width-16,base-4),fill=p['wall'][1])
        for x in range(12,width-12,10):d.polygon([(x,base-63),(x+9,base-63),(x+11,base-37),(x-2,base-37)],fill=p['cloth'] if (x//10)%2 else p['trim'])
        for x in range(20,width-18,12):
            d.rectangle((x,base-29,x+8,base-19),fill=['#bba56a','#8b9f65','#bb7452'][x//12%3]);d.line((x,base-29,x+8,base-29),fill='#e5cb8b')
        for x in [15,width-17]:d.rectangle((x,base-37,x+3,base+1),fill=p['wall'][0])
        png(region,name,im);return
    if region=='north':
        # A raised timber gallery, diagonal braces and carved gable.
        d.rectangle((left,walltop,right,wallbottom-9),fill=p['wall'][1])
        for x in range(left+2,right,7):d.line((x,walltop,x,wallbottom-9),fill=p['wall'][2])
        for x in [left+5,right-8]:d.rectangle((x,wallbottom-11,x+4,base),fill=p['wall'][0])
        d.line((left+7,base-1,right-8,wallbottom-13),fill=p['wall'][2],width=2)
        roof(im,d,[(5,walltop+4),(cx,13),(width-6,walltop+4),(width-17,walltop+12),(17,walltop+12)],p['roof'])
        roof(im,d,[(18,walltop-11),(cx,5),(width-19,walltop-11),(width-28,walltop-5),(27,walltop-5)],p['roof'],1)
        d.line((cx,10,cx,walltop-12),fill=p['trim'],width=2)
        for x,y in [(12,walltop+1),(width-13,walltop+1)]:finial(d,x,y,p,-1 if x<cx else 1)
        for y in range(walltop-24,walltop-9,5):d.line((cx-8,y,cx,y-5,cx+8,y),fill=p['trim'])
    elif region=='northeast':
        # Eroded masonry and a terraced sanctuary tower; artisan wings remain low.
        brick(d,(left,walltop,right,wallbottom),p['wall'])
        for j in range(3):
            y=walltop-11-j*12;inset=min(9+j*8, max(4,(right-left)//2-3))
            brick(d,(left+inset,y,right-inset,y+11),p['wall']);d.line((left+inset-3,y+10,right-inset+3,y+10),fill=p['trim'],width=2)
        if kind in ('guild','inn'):
            for j in range(3):
                x0=cx-15+j*3;y=walltop-44-j*9
                brick(d,(x0,y,cx+15-j*3,y+9),p['wall'])
            d.rectangle((cx-2,max(1,walltop-68),cx+2,max(4,walltop-58)),fill=p['trim'])
        for x in [left-5,right-4]:brick(d,(x,walltop-8,x+9,base-4),p['wall'])
    elif region=='south':
        # Arcaded plaster fronts, upper shutters, a balcony and varied pediments.
        color=['#b2c5b0','#d5b89a','#7fada5','#bda2a2'][sum(map(ord,name))%4]
        d.rectangle((left,walltop-19,right,wallbottom),fill=p['wall'][0]);d.rectangle((left+2,walltop-17,right-2,wallbottom-2),fill=color)
        roof(im,d,[(10,walltop-17),(27,walltop-35),(width-28,walltop-35),(width-11,walltop-17)],p['roof'])
        d.polygon([(cx-20,walltop-34),(cx,walltop-48),(cx+20,walltop-34)],fill=p['wall'][3]);d.line((cx-21,walltop-34,cx,walltop-49,cx+21,walltop-34),fill=p['roof'][1],width=2)
        for x in [left+8,right-23]:
            d.rectangle((x,walltop-9,x+13,walltop+7),fill='#466b69');d.line((x+6,walltop-8,x+6,walltop+7),fill=p['trim'])
        d.rectangle((left-5,walltop+12,right+5,walltop+18),fill=p['wall'][3])
        for x in range(left-2,right+5,7):d.line((x,walltop+10,x,walltop+24),fill=p['wall'][0])
        d.line((left-5,walltop+10,right+5,walltop+10),fill=p['trim'],width=2)
        for x in [left+4,right-6]:d.rectangle((x,walltop+20,x+4,wallbottom),fill=p['wall'][3])
    else:
        # River capital: two independent roof tiers and upward gold roof ends.
        brick(d,(left,walltop+1,right,wallbottom),p['wall'])
        roof(im,d,[(6,walltop+7),(cx,18),(width-7,walltop+7),(width-17,walltop+17),(16,walltop+17)],p['roof'])
        upper=['#354c44','#416b51','#709264','#d4bd77'] if kind in ('workshop','inn') else p['roof']
        roof(im,d,[(20,walltop-9),(cx,6),(width-21,walltop-9),(width-30,walltop-1),(29,walltop-1)],upper)
        for x,y,sgn in [(12,walltop+7,-1),(width-13,walltop+7,1),(25,walltop-9,-1),(width-26,walltop-9,1)]:finial(d,x,y,p,sgn)
        for x in [left+5,right-8]:d.rectangle((x,walltop+13,x+4,wallbottom),fill=p['trim'])
    door(d,cx-10,wallbottom-27,p)
    for x in ([left+9,right-24] if width >= 112 else [left+2]):window(d,x,wallbottom-28,p,14 if width >= 112 else 8,18 if width >= 112 else 13)
    lantern(d,left-6,walltop+23,p);lantern(d,right+6,walltop+23,p)
    if kind=='forge':
        brick(d,(left+3,16,left+22,walltop+10),[p['wall'][0],p['wall'][1],'#665850','#a58e6c'])
        d.rectangle((left,13,left+25,19),fill=p['trim']);d.rectangle((right-34,wallbottom-26,right-3,wallbottom),fill='#342d30')
        d.arc((right-32,wallbottom-32,right-5,wallbottom-3),180,360,fill='#d28b48',width=3);d.rectangle((right-27,wallbottom-19,right-9,wallbottom-2),fill='#e8a24e')
        d.polygon([(cx-18,base-3),(cx+14,base-3),(cx+18,base+1),(cx-22,base+1)],fill='#46535a')
        d.rectangle((cx-8,base-6,cx+7,base-2),fill='#a6b3af')
    elif kind=='workshop':
        for x in range(left+4,right-5,17):
            d.rectangle((x,base-7,x+9,base-2),fill='#9c674b');d.line((x+4,base-7,x+4,base-17),fill='#5a875c');d.line((x+4,base-13,x,base-16),fill='#a6b77a')
        d.ellipse((right-30,base-21,right-8,base-3),fill='#39555b');d.ellipse((right-26,base-17,right-12,base-8),fill='#8fa894')
    elif kind=='guild':
        for x in [left-8,right+6]:
            d.line((x,walltop+12,x,base),fill=p['trim']);d.polygon([(x+2,walltop+20),(x+13,walltop+20),(x+13,walltop+48),(x+7,walltop+43),(x+2,walltop+49)],fill=p['cloth'])
            d.line((x+7,walltop+25,x+7,walltop+38),fill=p['trim'])
    elif kind=='market':
        for x in range(left-7,right+1,12):d.polygon([(x,wallbottom-22),(x+10,wallbottom-22),(x+12,wallbottom-8),(x-2,wallbottom-8)],fill=p['cloth'] if (x//12)%2 else p['trim'])
        for x in [left-5,right-11]:
            d.rectangle((x,base-11,x+12,base-1),fill=p['wall'][0]);d.rectangle((x+1,base-10,x+11,base-4),fill='#b6b875')
    elif kind=='wardrobe':
        d.line((right+4,wallbottom-20,right+15,wallbottom-20),fill=p['trim']);d.polygon([(right+7,wallbottom-18),(right+12,wallbottom-18),(right+16,wallbottom-10),(right+13,wallbottom-8),(right+13,wallbottom),(right+5,wallbottom),(right+5,wallbottom-8),(right+2,wallbottom-10)],fill=p['cloth'])
    elif kind=='store':
        for x in [left-5,right-10]:d.rectangle((x,base-13,x+15,base-2),fill=p['wall'][0]);d.rectangle((x+2,base-11,x+13,base-4),outline=p['trim'])
    png(region,name,im)

def tiles(region):
    p=THEMES[region];im,d=canvas(128,160)
    materials=[p['grass'],['#73796b','#858c79','#5f6c64','#afb09a'],p['wall'],['#454246','#5a5151','#746354','#a08866'],p['grass'],['#715b47','#927452','#4e453b','#b3a175'],p['wall'] if region=='northeast' else ['#a58e60','#c6b17c','#8b795b','#dfcca1'],p['wall'],p['water'],['#67583f','#806c47','#514b38','#aa935e'],['#514944','#6c5a50','#3e3c3a','#92766a'],p['grass'],p['wall'],['#566b6d','#708382','#40595c','#a4b1a1'],['#476d6d','#72a49a','#314f59','#a5cfb7'],p['wall']]
    for mat,colors in enumerate(materials):
        for v in range(4):
            cell,q=canvas(16,16);rng=random.Random(mat*37+v*11+41);q.rectangle((0,0,15,15),fill=colors[0])
            if mat in [1,2,3,7,12,13,14,15]:
                for y in range(0,16,8):
                    for x in range(-4*(y//8%2),16,8):
                        q.rectangle((max(x,0),y,min(x+6,15),y+6),fill=colors[1+(x//8+y//8+v)%2]);q.line((max(x,0),y,min(x+5,15),y),fill=colors[3])
            elif mat==5:
                for y in range(0,16,4):q.line((0,y,15,y),fill=colors[2]);q.line((2,y+1,11,y+1),fill=colors[3])
            elif mat==8:
                for y in range(2,16,5):q.line(((v+y)%6,y,min(15,(v+y)%6+7),y),fill=colors[1+v%2])
            else:
                for _ in range(24):
                    x,y=rng.randrange(16),rng.randrange(16);q.line((x,y,min(x+1,15),y),fill=rng.choice(colors))
            i=mat*4+v;im.alpha_composite(cell,((i%8)*16,(i//8)*16))
    for v in range(16):
        cell,q=canvas(16,16)
        if v<4:q.line((0,2,15,2),fill=THEMES[region]['wall'][3])
        else:
            for x,y in [(3,5),(11,12),(7,7)]:q.line((x,y,x+1,y-2),fill=p['grass'][3])
        i=64+v;im.alpha_composite(cell,((i%8)*16,(i//8)*16))
    png(region,'city-tiles',im)

def residents(region):
    p=THEMES[region];im,d=canvas(48*16,48*18)
    for variant in range(18):
        for direction in range(4):
            for frame in range(4):
                x=(direction*4+frame)*48+24;y=variant*48+9;step=[0,1,0,-1][frame]
                d.ellipse((x-6,y+24,x+6,y+28),fill='#243b3b')
                d.rectangle((x-4,y+16,x-1,y+25+step),fill='#453d37');d.rectangle((x+1,y+16,x+4,y+25-step),fill='#453d37')
                cloth=[p['cloth'],p['roof'][2],p['wall'][1],'#716184'][variant%4]
                d.polygon([(x-5,y+7),(x+5,y+7),(x+7,y+19),(x-7,y+19)],fill=cloth)
                d.line((x-3,y+8,x+4,y+17),fill=p['trim'],width=2)
                skin=['#b48c63','#d0a77c','#936c51'][variant%3];d.rectangle((x-4,y,x+4,y+8),fill=skin)
                d.rectangle((x-5,y-2,x+4,y+1),fill='#383932')
                if variant%3==0:d.polygon([(x-8,y),(x,y-6),(x+8,y),(x+6,y+2),(x-7,y+2)],fill=p['trim'])
                if direction!=2:
                    eye=x-2 if direction==3 else x+2;d.point((eye,y+4),fill=INK)
                d.rectangle((x-8,y+10+step,x-6,y+17+step),fill=skin);d.rectangle((x+6,y+10-step,x+8,y+17-step),fill=skin)
    png(region,'city-residents',im)

def trees(region):
    p=THEMES[region];im,d=canvas(96*4,128*4)
    for variant in range(4):
        for frame in range(4):
            cell,q=canvas(96,128);sx=(0,1,0,-1)[frame];cx=48;ground=120
            q.ellipse((23,113,76,126),fill='#243b38');q.line((cx,ground,cx+sx,52),fill=p['wall'][0],width=9);q.line((cx+2,ground,cx+sx+2,55),fill=p['wall'][2],width=3)
            if region=='south':
                for a in range(7):
                    angle=a*math.pi/3.5;xx=cx+sx+math.cos(angle)*39;yy=46+math.sin(angle)*23
                    q.polygon([(cx+sx,48),(xx,yy),(xx-7,yy+10),(cx+sx+4,53)],fill=p['grass'][1+a%3])
                    q.line((cx+sx,48,xx-3,yy+4),fill=p['grass'][3])
                for dx in [-1,1]:q.line((cx,98,cx+dx*22,ground),fill=p['wall'][1],width=3)
            elif region=='northeast':
                for dx,dy,r in [(-20,53,19),(17,49,24),(-5,32,23)]:
                    q.ellipse((cx+dx-r+sx,dy-r,cx+dx+r+sx,dy+r),fill=p['grass'][1]);q.arc((cx+dx-r+sx,dy-r,cx+dx+r+sx,dy+r),195,320,fill=p['grass'][3],width=2)
            else:
                for j,(y,w) in enumerate([(67,39),(47,31),(28,22),(13,12)]):
                    q.polygon([(cx+sx,y-13),(cx+sx+w,y+25),(cx+sx-w,y+25)],fill=p['grass'][1+j%2]);q.line((cx+sx-w+4,y+23,cx+sx,y-10,cx+sx+w-5,y+23),fill=p['grass'][3])
                if variant==2:
                    for x in [30,44,57,64]:q.line((x,95,x+sx,15),fill=p['grass'][3],width=2)
            im.alpha_composite(cell,(frame*96,variant*128))
    png(region,'city-trees',im)

def scenery():
    # Ground detail for the highland nursery: deliberate banks and irrigated rows.
    p=THEMES['north'];im,d=canvas(128,96)
    for j in range(4):
        y=12+j*18;left=7+j*5;right=120-j*4
        d.polygon([(left,y+5),(right-13,y),(right,y+11),(left+10,y+17)],fill='#8f9162',outline='#c1b078')
        d.polygon([(left+4,y+7),(right-13,y+3),(right-5,y+10),(left+12,y+13)],fill=p['water'][1])
        for x in range(left+12,right-10,8):d.line((x,y+7,x-1,y+3),fill='#b2bd78');d.line((x,y+7,x+2,y+4),fill='#77965d')
    png('north','rice-terrace',im)
    # Four loop frames on a native 32x96 grid, fitting the actual narrow stream.
    sheet,q=canvas(128,96)
    for f in range(4):
        cell,d=canvas(32,96)
        d.polygon([(4,4),(25,0),(31,17),(28,85),(21,95),(3,87),(0,26)],fill='#455d59')
        for x,y,w,h in [(3,8,7,18),(24,13,6,22),(0,47,8,20),(24,66,7,22)]:d.rectangle((x,y,x+w,y+h),fill='#708780');d.line((x,y,x+w,y),fill='#afbaa0')
        d.polygon([(11,6),(23,5),(22,29),(19,57),(23,86),(10,88),(9,55),(12,30)],fill='#74b6ba')
        for x in [12,16,20]:
            for y in range(8+(f*3+x)%9,85,13):d.line((x,y,x-1,y+7),fill='#c8e4d5')
        d.ellipse((4,82,29,95),fill='#548f98',outline='#a6d5cb');d.arc((8,84,25,92),10+f*35,150+f*35,fill='#d8e6c9',width=1)
        sheet.alpha_composite(cell,(f*32,0))
    png('north','waterfall',sheet)
    # Open sandstone gateway. Its two visible feet have matching collision boxes.
    p=THEMES['northeast'];im,d=canvas(144,96)
    for x in [20,112]:
        brick(d,(x,34,x+14,89),p['wall']);d.rectangle((x-3,85,x+17,94),fill=p['wall'][1]);d.line((x-3,85,x+17,85),fill=p['trim'],width=2)
    for j in range(3):
        y=33-j*10;inset=j*8
        brick(d,(12+inset,y,132-inset,y+10),p['wall']);d.line((10+inset,y+10,134-inset,y+10),fill=p['trim'],width=2)
    for x in range(39,110,13):d.polygon([(x,36),(x+5,31),(x+10,36),(x+5,41)],fill=p['wall'][0]);d.point((x+5,35),fill=p['trim'])
    d.rectangle((69,1,75,7),fill=p['wall'][2]);png('northeast','ruin-gateway',im)
    # Fishing boat and limestone stack remain scenery in physically blocked water.
    p=THEMES['south'];im,d=canvas(64,48)
    d.ellipse((2,32,62,45),fill='#315960');d.polygon([(2,21),(14,14),(52,15),(63,27),(49,38),(13,35)],fill='#514b3d',outline='#d6b67a')
    d.polygon([(9,22),(17,18),(49,19),(56,26),(47,32),(16,30)],fill='#9d7d54')
    for x in [20,33,46]:d.line((x,19,x,30),fill='#d4bd85',width=2)
    d.rectangle((30,5,32,28),fill='#574f3e');d.polygon([(32,6),(51,21),(33,21)],fill='#c6d1b3')
    d.line((29,10,12,35),fill='#8e9e89');d.rectangle((8,22,21,27),fill='#567a72');png('south','harbor-boat',im)
    im,d=canvas(80,112);d.ellipse((5,93,75,110),fill='#315b5e')
    d.polygon([(12,94),(17,47),(28,30),(30,10),(46,4),(57,25),(62,62),(71,96),(54,106),(27,106)],fill='#8f9d8e',outline='#cbd1b3')
    d.polygon([(30,12),(41,8),(43,72),(31,100),(18,92),(24,49)],fill='#bdc3a5')
    for x,y in [(21,47),(41,31),(53,68),(32,81)]:d.line((x,y,x+8,y-5,x+14,y+2),fill='#6e847a',width=2)
    for x,y in [(26,30),(47,21),(16,84)]:d.polygon([(x,y),(x+12,y-3),(x+18,y+3),(x+5,y+5)],fill='#447761')
    png('south','coastal-cliff',im)

for region in THEMES:
    residents(region);trees(region)
    if region != 'central':
        tiles(region)
        for name,kind,w,h in [('city-market','market',144,128),('city-forge','forge',144,128),('city-workshop','workshop',144,128),('city-inn','inn',144,128),('city-guild','guild',144,144),('city-wardrobe','wardrobe',80,100),('city-store','store',80,96),('city-stall','stall',80,80)]:building(region,name,kind,w,h)
        for name,w,h in [('city-home-slope',80,112),('city-home-gallery',96,104),('city-home-corner',80,96)]:building(region,name,'inn',w,h)
    else:
        selected={'city-forge':'forge','city-guild':'guild','city-market-hall':'market','city-greenhouse':'workshop','city-conservatory':'workshop','city-maproom':'guild','city-foundry-wing':'forge','city-cooling-shed':'store','workshop':'workshop','wardrobe':'wardrobe','inn':'inn','store':'store','city-home-red':'inn','city-home-blue':'inn','city-home-thatch':'inn','city-home-corner':'store','city-home-balcony':'inn','city-home-laundry':'wardrobe'}
        for name,kind in selected.items():
            path=ROOT/'public/assets/haven'/(name+'.png')
            with Image.open(path) as source:w,h=source.size
            building(region,name,kind,w,h)

scenery()

for path,data in outputs.items():
    if args.check:
        if not path.exists() or path.read_bytes()!=data:raise SystemExit('Stale regional asset: '+str(path.relative_to(ROOT)))
    else:
        path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
print(('Verified' if args.check else 'Generated'),len(outputs),'original regional PNGs; no concept boards shipped')
