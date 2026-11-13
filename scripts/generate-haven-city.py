"""Original CC0 nine-district city. Native pixels, shared navigation data, no reference pixels.
Pillow is regeneration-only; runtime uses committed tiles, atlases and JSON.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import argparse, io, json, math, random, importlib.util

ROOT = Path(__file__).resolve().parent.parent
CITY = json.loads((ROOT/'src/game/world/city-layout.json').read_text())
OUT = ROOT/'public/assets/haven'
CHECK = argparse.ArgumentParser()
CHECK.add_argument('--check', action='store_true')
args = CHECK.parse_args()
INK='#202c32'; WOOD='#69513f'; GOLD='#c8ac78'
outputs={}
def emit(path,data): outputs[ROOT/path]=data
def png(name,im):
    out=io.BytesIO();im.save(out,format='PNG',optimize=True);emit('public/assets/haven/'+name+'.png',out.getvalue())
def canvas(w,h):
    im=Image.new('RGBA',(w,h));return im,ImageDraw.Draw(im)
def brick(q,box,colors,seed=1):
    rng=random.Random(seed);x0,y0,x1,y1=map(int,box)
    q.rectangle(box,fill=colors[0])
    for row,y in enumerate(range(y0,y1,6)):
        for x in range(x0-8*(row%2),x1,16):
            xx=max(x0,x);rr=min(x+14,x1)
            if rr>xx:
                q.rectangle((xx,y,rr,min(y+4,y1)),fill=rng.choice(colors[1:]));q.line((xx+1,y,rr,y),fill=colors[-1])
def roof(q,poly,colors,seed=1):
    mask=Image.new('1',q._image.size);ImageDraw.Draw(mask).polygon(poly,fill=1)
    rng=random.Random(seed);box=mask.getbbox();q.polygon(poly,fill=INK)
    for y in range(box[1]+2,box[3]-1,5):
        for x in range(box[0]+1,box[2]-1):
            if mask.getpixel((x,y)) and mask.getpixel((x,min(y+3,box[3]-1))):
                q.point((x,y),fill=colors[-1]);q.line((x,y+1,x,y+3),fill=colors[(x//8+y//5)%len(colors)])
    for a,b in zip(poly,poly[1:]+poly[:1]):q.line((a,b),fill=colors[0],width=2)
def window(q,x,y,w=18,h=20):
    q.rectangle((x-2,y-2,x+w+2,y+h+2),fill=WOOD);q.rectangle((x,y,x+w,y+h),fill='#41656a')
    q.rectangle((x+2,y+2,x+w//2-1,y+h//2),fill='#d4bb7c');q.line((x+w//2,y,x+w//2,y+h),fill=GOLD)
    q.line((x,y+h//2,x+w,y+h//2),fill=WOOD);q.line((x,y,x+w,y),fill='#a5bcbc')
def door(q,x,y,w=24,h=31):
    q.rectangle((x-3,y-3,x+w+3,y+h),fill='#c3ae88');q.rectangle((x,y,x+w,y+h),fill='#393c37')
    for xx in range(x+2,x+w,5):q.line((xx,y+2,xx,y+h),fill='#75604b')
    q.point((x+w-4,y+h-11),fill='#f0ce82');q.rectangle((x-5,y+h,x+w+5,y+h+3),fill='#b4aa8a')
def banner(q,x,y,color,mark=False):
    q.line((x-3,y,x+13,y),fill=GOLD,width=2);q.polygon([(x,y),(x+10,y),(x+10,y+27),(x+5,y+23),(x,y+28)],fill=INK)
    q.polygon([(x+1,y+1),(x+9,y+1),(x+9,y+24),(x+5,y+20),(x+1,y+25)],fill=color)
    if mark:q.polygon([(x+5,y+5),(x+8,y+10),(x+5,y+15),(x+2,y+10)],fill=GOLD)

# Sixteen materials × four deliberately varied native 16px cells.
materials=['grass','cobble','sandstone','charcoal','garden','wood','sand','limestone','water','soil','ash','flowers','clay','slate','rune','steps']
palettes=[['#3e513e','#4a5e43','#526848','#344a3c'],['#727665','#858775','#5f695e','#92917a'],['#af9c73','#bdac82','#998966','#cab890'],['#454144','#575052','#37383d','#72635a'],['#405745','#53694c','#30493e','#688052'],['#80674d','#a08a64','#594939','#c2a274'],['#b29b65','#c4ad73','#968557','#d6be82'],['#b5ac8f','#cec2a2','#8d9585','#ded2b0'],['#28565b','#397579','#21464d','#599a99'],['#605440','#79694a','#4c4939','#98845b'],['#4f4544','#6c5750','#3d373b','#957260'],['#3e5643','#647f4c','#315040','#b0a478'],['#8f7761','#ac9474','#76685b','#c3ac86'],['#526773','#70848b','#3b535d','#9ba7a0'],['#536d72','#759795','#344f59','#95c4bc'],['#9a9b89','#b5b19a','#7a867c','#d5cab0']]
tiles,q=canvas(128,160)
for mat,colors in enumerate(palettes):
    for v in range(4):
        im,d=canvas(16,16);rng=random.Random(mat*43+v+91);d.rectangle((0,0,15,15),fill=colors[0])
        if mat in (1,2,3,7,12,13,14,15):
            for y in range(0,16,8 if mat!=3 else 4):
                shift=4*(y//8%2)
                for x in range(-shift,16,8):
                    d.rectangle((max(0,x),y,min(15,x+6),min(15,y+6)),fill=colors[(x//8+y//8+v)%2]);d.line((max(0,x),y,min(15,x+5),y),fill=colors[3])
            if mat==14:d.line((2,7,6,3,10,7,6,11,2,7),fill=colors[3])
        elif mat==5:
            for y in range(0,16,4):d.rectangle((0,y,15,y+2),fill=colors[(y//4+v)%2]);d.line((2,y+1,11,y+1),fill=colors[3]);d.point((13,y+1),fill=colors[2])
        elif mat==8:
            for y in range(2,16,5):
                x=(v*3+y)%7;d.line((x,y,min(15,x+6),y),fill=colors[1]);d.point((x+1,min(15,y+1)),fill=colors[3])
        else:
            for _ in range(26):
                x,y=rng.randrange(16),rng.randrange(16);d.line((x,y,min(15,x+1),y),fill=rng.choice(colors))
            if mat==11:
                for x,y in [(3,5),(11,12)]:d.line((x,y,x,y+2),fill='#7b9861');d.point((x,y-1),fill=['#c1a3bd','#e3c18a','#8aafd0','#c77e77'][v])
        index=mat*4+v;tiles.alpha_composite(im,((index%8)*16,(index//8)*16))
# Transparent edge accents, moss seams and tiny curb corners occupy the final two rows.
for v in range(16):
    im,d=canvas(16,16)
    if v<4:
        y=1 if v%2==0 else 14;d.line((0,y,15,y),fill='#a4a98b');d.line((0,min(15,y+1),15,min(15,y+1)),fill='#43534a')
    elif v<8:
        for x,y in [(2,3),(7,10),(12,4)]:d.line((x,y,x+2,y),fill='#6b8052');d.point((x+1,y-1),fill='#a5a16b')
    elif v<12:
        d.line((0,7,15,7),fill='#abc2b0');d.line((3,9,10,9),fill='#699e95')
    else:
        d.point((3,11),fill='#d8c499');d.line((4,12,7,12),fill='#3e4c42')
    i=64+v;tiles.alpha_composite(im,((i%8)*16,(i//8)*16))
png('city-tiles',tiles)

# Buildings have different structural footprints, roof forms, openings and trade machinery.
buildings={}
def build(name,kind):
    width=192 if kind=='forge' else 128 if kind=='shelter' else 96 if kind.startswith('home') else 160
    height=112 if width in (96,128) else 144
    im,d=canvas(width,height);cx=width//2
    d.ellipse((8,height-18,width-6,height-2),fill='#17282d')
    if kind=='forge':
        brick(d,(24,76,168,130),['#4b4241','#67564d','#7f6654','#a08767'])
        roof(d,[(10,78),(37,27),(119,24),(177,75)],['#493f3b','#855b48','#a97654','#c79363'])
        brick(d,(42,7,65,76),['#3b383d','#5a5050','#736358','#9c8569']);d.rectangle((39,4,68,10),fill='#ae9370')
        d.rectangle((92,74,162,130),fill='#282c32');d.rectangle((101,86,154,126),fill='#805239')
        d.ellipse((111,91,146,125),fill='#c5743e');d.rectangle((113,108,144,125),fill='#eea15a')
        for y in range(82,128,6):d.line((98,y,106,y),fill='#b18e65')
        d.rectangle((26,111,90,126),fill='#67513d');d.line((25,110,92,110),fill='#b9a174',width=2)
        for x in [31,77]:d.rectangle((x,126,x+4,140),fill='#3f3933')
        d.polygon([(38,109),(72,109),(81,113),(63,117),(62,121),(44,121),(45,116),(34,114)],fill='#8a9996')
        d.line((41,110,71,110),fill='#c6d0ba');banner(d,171,83,'#a04e3e',True)
        d.ellipse((12,113,31,132),fill='#4a4a43');d.ellipse((14,112,30,121),fill='#628d8d')
    elif kind=='greenhouse':
        d.rectangle((18,74,142,129),fill='#315454');roof(d,[(10,77),(78,17),(151,77)],['#345158','#557d7b','#83a9a0','#b2d2be'])
        for x in range(23,143,20):
            d.rectangle((x,80,x+15,119),fill='#668e84');d.line((x+2,83,x+10,91),fill='#bfd8be');d.line((x,121,x+15,121),fill='#7b995a')
            for k in range(4):d.line((x+3+k*3,116,x+3+k*3,97-(k%2)*5),fill=['#3f684b','#b1a66f','#8b70a1'][k%3])
        for x in [17,57,101,142]:d.rectangle((x,75,x+3,130),fill='#405b53')
        d.line((80,18,80,77),fill='#d5ce9d',width=2);door(d,69,99,22,30)
        for x in [10,139]:d.rectangle((x,124,x+13,135),fill='#84614d');d.ellipse((x-3,115,x+16,127),fill='#607c53');d.point((x+3,116),fill='#bc9cc4')
        d.rectangle((64,69,94,82),fill='#354a41',outline=GOLD);d.ellipse((74,72,84,80),fill='#b6a0c5')
    elif kind=='guild':
        brick(d,(18,77,142,130),['#5b655f','#7a8276','#929a86','#b9bb9a'])
        roof(d,[(5,78),(31,27),(128,27),(155,78)],['#33434f','#506778','#728891','#a4b2ac'])
        roof(d,[(59,66),(80,8),(101,66)],['#33434f','#506778','#728891','#a4b2ac'])
        d.rectangle((70,49,90,75),fill='#b5b098');window(d,74,52,11,17)
        for x in [28,111]:window(d,x,90,20,23)
        door(d,68,99,24,31);banner(d,5,80,'#4d7291',True);banner(d,145,80,'#4d7291',True)
        d.rectangle((47,82,111,93),fill='#314951',outline=GOLD)
        d.line((74,84,83,90,90,84),fill='#dbc99a',width=2)
        for x in [22,131]:d.rectangle((x,124,x+8,138),fill='#6c786a')
    elif kind=='shelter':
        d.rectangle((18,68,111,99),fill='#6b6752');d.rectangle((17,94,112,102),fill='#b8a279')
        roof(d,[(5,67),(28,24),(100,24),(123,67)],['#4d513e','#737455','#9b986b','#c1b98a'])
        for x in [18,106]:d.rectangle((x,66,x+5,101),fill='#6e503b');d.line((x+1,68,x+1,100),fill='#aa855a')
        d.rectangle((25,70,101,94),fill='#2d3f3a');d.rectangle((35,79,65,92),fill='#755d49')
        d.rectangle((36,76,61,83),fill='#b2aa7a');d.rectangle((76,75,94,94),fill='#806f4d')
        d.ellipse((79,76,90,86),fill='#9eac72');d.rectangle((51,55,83,67),fill='#3d5141',outline=GOLD)
        d.polygon([(62,62),(67,57),(72,62),(67,65)],fill='#d8c391')
    elif kind.startswith('home'):
        brick(d,(12,70,84,101),['#8a7f67','#a79678','#b6a185','#d1ba95'])
        cols={'home-blue':['#3d4a58','#5c6c80','#7b8c9a','#a8b2af'],'home-red':['#603e3c','#895b4d','#ad7c5d','#d0a377'],'home-thatch':['#625d43','#8c8256','#b1a16b','#d2c28b']}[kind]
        if kind=='home-blue':
            roof(d,[(3,72),(21,25),(76,25),(93,72)],cols)
            roof(d,[(30,62),(45,35),(61,62)],cols);window(d,40,49,11,15)
            d.rectangle((18,18,28,44),fill='#6d695b');d.rectangle((16,16,30,20),fill='#b5a88a')
        elif kind=='home-red':
            roof(d,[(2,72),(21,37),(53,37),(67,16),(93,72)],cols)
            d.rectangle((69,10,79,36),fill='#6d695b');d.rectangle((67,8,81,12),fill='#b5a88a')
            d.line((48,39,60,69),fill='#d0a377',width=2)
        else:
            roof(d,[(0,74),(6,51),(21,32),(48,20),(75,32),(89,51),(95,74)],cols)
            for x in range(8,88,7):d.line((x,68,x+3,74),fill='#dfc994',width=2)
            d.rectangle((36,49,59,65),fill='#b09b6c');window(d,41,52,13,14)
        window(d,21,77,15,16);door(d,55,77,17,24)
        d.rectangle((9,98,39,104),fill='#7e664b')
        for x in range(12,38,4):d.line((x,97,x+2,92),fill='#6e864e');d.point((x+2,92),fill='#bd8a91')
    else: # Tailor hall: broad stitched canvas, side stock loft, open display window.
        brick(d,(18,77,142,130),['#78634d','#9e8463','#b69d77','#d8bd8e'])
        roof(d,[(5,76),(27,31),(113,20),(155,76)],['#624747','#8f6156','#b68066','#d1aa80'])
        window(d,25,90,33,26);door(d,72,101,23,29);window(d,112,91,19,25)
        d.polygon([(18,80),(65,80),(70,97),(13,97)],fill='#4b6e65')
        for x in range(18,65,10):d.polygon([(x,81),(x+4,81),(x+4,96),(x-4,96)],fill='#c7b080')
        d.rectangle((54,65,112,79),fill='#344b43',outline=GOLD)
        d.line((76,69,87,75,96,69),fill='#dac89c',width=2);d.rectangle((29,119,61,130),fill='#6d5d47')
        for x in range(32,60,8):d.rectangle((x,115,x+5,126),fill=['#7c9a79','#c29c65','#718d9d'][(x//8)%3])
    buildings[name]=im;png(name,im)
for name,kind in [('city-forge','forge'),('city-greenhouse','greenhouse'),('city-guild','guild'),('city-shelter','shelter'),('city-market-hall','market-hall'),('city-home-blue','home-blue'),('city-home-red','home-red'),('city-home-thatch','home-thatch')]:build(name,kind)

# Compound architecture is authored at native resolution, never enlarged to fill the new map.
def annex(name,kind):
    sizes={'foundry':(128,112),'cooling':(112,96),'tower':(64,176),'maproom':(128,144),'conservatory':(160,192),'shrine':(96,144),'balcony':(112,128),'corner':(128,128),'laundry':(112,128),'arcade':(192,112)}
    w,h=sizes[kind];im,q=canvas(w,h)
    q.ellipse((3,h-15,w-3,h-1),fill='#253730')
    if kind=='foundry':
        brick(q,(16,57,112,98),['#4b4140','#6d5348','#8f6953','#b28f68'])
        roof(q,[(4,59),(26,19),(101,13),(124,59)],['#4b3d37','#855b42','#ac7950','#d0a16b'])
        for x in [27,70]:
            q.rectangle((x,62,x+31,95),fill='#30373a');q.ellipse((x+3,67,x+28,94),fill='#a8663d');q.line((x+5,90,x+26,90),fill='#e9b76e',width=3)
        brick(q,(83,0,103,42),['#454248','#685b53','#8e7860','#b6a184']);q.rectangle((80,0,106,7),fill='#c2ac83')
        for x in [18,107]:q.line((x,59,x,98),fill='#b39b70',width=3)
    elif kind=='cooling':
        q.rectangle((14,50,98,82),fill='#74654c');q.rectangle((21,53,91,76),fill='#394e4a')
        roof(q,[(5,52),(19,21),(92,28),(107,52)],['#4a5550','#6b7c67','#91a083','#c2c2a0'])
        for x in [14,54,96]:q.rectangle((x,49,x+3,84),fill='#64513d')
        for x in [29,68]:q.ellipse((x,68,x+20,84),fill='#557576',outline='#9ea98d',width=2)
        q.line((30,74,45,74),fill='#97c2b2');q.line((69,75,85,75),fill='#97c2b2')
    elif kind=='tower':
        brick(q,(10,65,54,162),['#4e6269','#71828a','#8b9c9d','#b5bfae'])
        roof(q,[(1,70),(32,7),(63,70)],['#334654','#4f6b7f','#7893a0','#acbab5'])
        for y in [86,124]:window(q,24,y,14,22)
        q.rectangle((5,102,59,107),fill='#c1b793');q.rectangle((4,105,8,117),fill=WOOD);q.rectangle((56,105,60,117),fill=WOOD)
        banner(q,48,118,'#577997',True);q.line((32,6,32,0),fill=GOLD,width=2)
    elif kind=='maproom':
        brick(q,(16,82,112,130),['#687b78','#8d9c91','#a8b39c','#c9c7aa'])
        roof(q,[(4,85),(25,34),(111,34),(124,85)],['#354952','#5b7481','#829a9f','#b7c5bb'])
        roof(q,[(43,70),(62,12),(82,70)],['#3b4e59','#607c8d','#8da1a5','#c0cbbb'])
        for x in [25,57,89]:window(q,x,91,17,24)
        q.rectangle((13,118,115,121),fill='#b9ad85')
        for x in range(15,115,9):q.rectangle((x,120,x+2,130),fill='#6c6650')
        q.rectangle((36,124,91,135),fill='#495d5c');q.line((42,128,80,128),fill='#cabf98')
    elif kind=='conservatory':
        brick(q,(18,130,142,178),['#586e63','#7d8d76','#9fac8a','#c1bba0'])
        q.pieslice((6,9,154,155),180,360,fill='#4a7274',outline='#b8d2b8',width=2)
        q.rectangle((7,82,153,130),fill='#527f7a')
        for x in range(13,153,16):
            q.line((x,83,x,129),fill='#bfd5b7',width=2);q.line((x,83,80,11),fill='#8caf9e')
        for y in [84,108,130]:q.line((7,y,153,y),fill='#b6cab0',width=2)
        for x in range(25,140,14):
            q.rectangle((x,152,x+9,169),fill='#7c6d53');q.line((x+5,154,x+5,115-(x%3)*7),fill='#8cad74',width=2)
            q.polygon([(x-3,137),(x+5,125),(x+12,133),(x+5,140)],fill='#718f5e');q.point((x+5,119-(x%3)*7),fill='#c9a8ce')
        door(q,69,147,22,31);q.rectangle((77,2,83,11),fill='#c1ceb0')
    elif kind=='shrine':
        q.rectangle((14,110,82,130),fill='#6e795d')
        for x in [14,76]:q.rectangle((x,58,x+6,129),fill='#7d6549');q.line((x+1,61,x+1,128),fill='#bba171')
        roof(q,[(2,63),(48,12),(94,63)],['#435b45','#63784e','#869b64','#b1b684'])
        q.rectangle((32,91,65,123),fill='#3c5446');q.ellipse((36,96,60,119),fill='#78956b');q.line((48,98,48,116),fill=GOLD,width=2)
        banner(q,11,76,'#83965e');banner(q,77,76,'#83965e')
    elif kind=='arcade':
        roof(q,[(0,48),(19,6),(169,6),(191,48)],['#625448','#8f7558','#b99b6f','#d4bc8b'])
        for x in [12,172]:
            q.rectangle((x,45,x+8,110),fill='#ac9875');q.rectangle((x-3,104,x+11,111),fill='#d0ba91')
        q.rectangle((14,47,178,54),fill='#cbb58b')
        for x in range(26,170,24):q.rectangle((x,54,x+5,65),fill='#cbb58b');q.line((x+5,65,x+19,54),fill='#8c7958',width=2)
        for x in [44,88,132]:banner(q,x,57,['#6f8b77','#9f7d70','#6f8294'][x//44-1],True)
    else:
        left,right=(20,108) if kind=='corner' else (16,96)
        brick(q,(left,78 if kind!='balcony' else 74,right,114),['#82725f','#a18d70','#bba385','#d7bf96'])
        if kind=='balcony':
            roof(q,[(5,76),(21,27),(77,27),(106,76)],['#394f62','#5a7386','#819aa6','#b3c2b9'])
            window(q,28,81,20,22);door(q,68,83,17,31)
            q.rectangle((11,104,62,107),fill=GOLD)
            for x in range(14,62,8):q.rectangle((x,105,x+2,117),fill='#6b6752')
            q.rectangle((24,50,47,74),fill='#bba88b');window(q,29,54,13,16)
        elif kind=='corner':
            roof(q,[(5,80),(19,20),(75,20),(84,45),(120,45),(126,80)],['#634843','#996b56','#b98a66','#d7b48a'])
            roof(q,[(61,81),(75,50),(116,50),(126,81)],['#634843','#996b56','#b98a66','#d7b48a'])
            window(q,31,87,18,18);door(q,75,83,20,31);q.rectangle((23,105,58,115),fill='#6c5e47')
        else:
            roof(q,[(3,79),(9,44),(28,20),(55,10),(83,25),(104,50),(109,79)],['#666047','#918253','#b4a06b','#d8c18c'])
            door(q,56,83,20,31);window(q,24,88,19,19)
            q.line((5,85,103,89),fill=GOLD)
            for x,c in [(12,'#819c9b'),(33,'#c8c6a1'),(83,'#9a7685')]:q.rectangle((x,89,x+12,103),fill=c)
    buildings[name]=im;png(name,im)
for name,kind in [('city-foundry-wing','foundry'),('city-cooling-shed','cooling'),('city-watchtower','tower'),('city-maproom','maproom'),('city-conservatory','conservatory'),('city-oak-shrine','shrine'),('city-home-balcony','balcony'),('city-home-corner','corner'),('city-home-laundry','laundry'),('city-market-arcade','arcade')]:annex(name,kind)

im,q=canvas(32,48)
q.ellipse((2,37,30,47),fill='#566d64',outline='#b4ba97',width=2)
q.polygon([(16,3),(25,17),(21,34),(16,40),(9,31),(7,17)],fill='#527d8b',outline='#a9d8c5')
q.polygon([(16,6),(16,33),(10,29),(9,18)],fill='#91c1b4');q.line((16,8,13,22,16,34),fill='#d6e3bb')
png('city-waypoint',im);buildings['city-waypoint']=im

for i,kind in enumerate(['armor','helmet','pants','boots','supplies','resources']):
    im,d=canvas(72,80);c=[('#57766a','#c6b486'),('#536778','#c7c1a0'),('#7d666b','#d0b194'),('#856b4f','#d2b480'),('#6a657d','#c8b6cb'),('#805a4c','#d3ae7c')][i]
    d.ellipse((3,66,70,79),fill='#20312f');d.rectangle((12,34,61,70),fill='#644e3d');d.rectangle((10,55,63,68),fill='#a1845c')
    for x in [12,59]:d.rectangle((x,25,x+3,74),fill='#5b4b39');d.line((x+1,26,x+1,72),fill='#b69a69')
    d.polygon([(7,16),(58,16),(71,39),(1,39)],fill=INK)
    for x in range(8,59,9):d.polygon([(x,18),(x+8,18),(x+12,37),(x-5,37)],fill=c[(x//9)%2]);d.rectangle((x-5,37,x+11,41),fill=c[(x//9)%2])
    d.line((8,16,58,16),fill=c[1]);d.rectangle((24,6,48,17),fill='#34453f',outline=GOLD)
    if kind=='armor':d.polygon([(30,45),(36,43),(43,46),(45,58),(29,58),(27,48)],fill='#c0a16d');d.line((31,47,41,55),fill='#6f8869',width=2)
    elif kind=='helmet':d.ellipse((28,43,45,59),fill='#a9b4a7');d.rectangle((30,53,43,61),fill='#3e4d4d');d.line((35,44,35,53),fill='#e1c785',width=2)
    elif kind=='pants':d.rectangle((29,44,44,51),fill='#b1956a');d.rectangle((29,51,34,61),fill='#a08560');d.rectangle((39,51,44,61),fill='#a08560')
    elif kind=='boots':
        for x in [28,40]:d.rectangle((x,45,x+6,57),fill='#7a6043');d.rectangle((x-1,56,x+8,61),fill='#b69561')
    elif kind=='supplies':
        for x in [23,34,46]:d.rectangle((x,47,x+3,50),fill=GOLD);d.ellipse((x-2,50,x+5,60),fill=['#a06570','#779e9d','#a19c69'][x%3])
    else:
        for x in [24,36,47]:d.polygon([(x,60),(x+6,48),(x+11,60)],fill=['#a59169','#9aa99d','#738476'][x%3])
    d.rectangle((13,70,61,73),fill='#bda87a');buildings['city-stall-'+kind]=im;png('city-stall-'+kind,im)

# A monumental broken-stone ring: stepped masonry, suspended fragments, visible aperture.
im,d=canvas(160,176)
d.ellipse((6,142,154,174),fill='#243b40');d.ellipse((16,145,144,169),fill='#6f8580',outline='#b0b5a0',width=2)
d.ellipse((29,11,131,156),fill='#293b43');d.ellipse((36,17,124,150),fill='#829a8f');d.ellipse((46,27,114,140),fill='#294a55');d.ellipse((51,32,109,135),fill='#78b7b4');d.ellipse((56,37,104,130),fill='#244450')
for i in range(13):
    a=math.pi*2*i/13;x=80+math.cos(a)*46;y=82+math.sin(a)*67
    d.polygon([(int(x-5),int(y-8)),(int(x+5),int(y-7)),(int(x+7),int(y+6)),(int(x-6),int(y+8))],fill='#657f79',outline='#b4bca1')
    d.line((int(x-2),int(y-3),int(x+2),int(y+3)),fill='#9ee6d5',width=2)
for x in [16,130]:
    brick(d,(x,112,x+16,152),['#455b5a','#657774','#81918b','#b2b59b']);d.polygon([(x-3,112),(x+8,99),(x+20,112)],fill='#a7b29b')
for x,y in [(21,45),(131,66),(37,6),(111,16)]:d.polygon([(x,y),(x+7,y-5),(x+12,y+6),(x+5,y+10)],fill='#738d83',outline='#c0c4a6')
buildings['city-portal']=im;png('city-portal',im)
im,d=canvas(80,112)
d.ellipse((4,85,76,110),fill='#263b3a');d.polygon([(7,92),(40,78),(73,92),(73,100),(40,111),(7,100)],fill='#7b8f7e',outline='#bec3a0')
for x,y in [(15,83),(60,83)]:d.rectangle((x,y,x+6,y+13),fill='#c3b58a')
d.polygon([(40,4),(59,38),(51,73),(40,86),(25,67),(21,37)],fill='#284d5e',outline='#b1ddd0')
d.polygon([(40,7),(42,66),(25,65),(24,36)],fill='#80bcb5');d.polygon([(43,12),(56,38),(48,69),(44,77)],fill='#528f9f')
d.line((40,8,34,44,40,75),fill='#d3f1d4',width=2);d.line((27,39,38,47,54,39),fill='#aedbd0')
buildings['city-crystal']=im;png('city-crystal',im)
im,d=canvas(112,104)
d.polygon([(8,66),(23,45),(88,45),(105,66),(105,88),(85,101),(27,101),(8,88)],fill='#414e4c',outline='#aab19c',width=2)
d.polygon([(16,68),(29,52),(83,52),(97,68),(97,84),(81,94),(31,94),(16,84)],fill='#3c7475',outline='#d4c5a2',width=2)
for x in range(27,87,11):d.line((x,59,x+9,59),fill='#7db2a1')
d.rectangle((51,28,61,77),fill='#aaa98c');d.ellipse((33,27,80,46),fill='#bcc0a0',outline='#657f75',width=2);d.ellipse((38,29,75,39),fill='#699b8f')
d.rectangle((53,9,59,29),fill='#bcbfa0');d.polygon([(47,9),(56,1),(65,9),(61,18),(50,18)],fill='#d9d3aa')
d.line((56,17,56,74),fill='#b6dfc4',width=2)
buildings['city-fountain']=im;png('city-fountain',im)

# A reusable prop vocabulary; each frame has an occupation and a distinctive contour.
props,d=canvas(256,384)
for f in range(56):
    im,q=canvas(32,48);cx=16;q.ellipse((3,38,29,46),fill='#23372f')
    if f==0:
        for y in [24,28,33]:q.rectangle((2,y,29,y+2),fill='#a18b63');q.line((3,y,27,y),fill='#c0aa7d')
        for x in [5,25]:q.rectangle((x,34,x+2,43),fill='#594b38')
    elif f in (1,35):
        q.rectangle((15,9,17,43),fill='#635a44');q.line((16,4,25,4,25,9),fill=GOLD,width=2)
        q.rectangle((20,9,30,24),fill=INK,outline=GOLD);q.rectangle((23,12,27,21),fill='#e7c17d' if f==1 else '#96dcd1');q.rectangle((11,41,22,44),fill='#777c65')
    elif f in (2,7,39):
        q.rectangle((7,18,9,42),fill=WOOD);q.rectangle((24,18,26,42),fill=WOOD);q.rectangle((3,12,29,33),fill=WOOD,outline=GOLD)
        q.rectangle((7,16,24,29),fill='#d4c69f');q.line((9,20,21,20),fill='#8b886d');q.line((9,24,18,24),fill='#8b886d')
        if f==7:q.line((10,25,15,18,20,22),fill='#708978')
    elif f in (3,9):
        q.ellipse((6,19,27,42),fill='#826849');q.rectangle((7,23,26,37),fill='#947c56');q.ellipse((6,17,27,26),fill='#3f5a58' if f==9 else '#bba16e',outline='#6e7c6a',width=2)
        for y in [27,36]:q.line((7,y,26,y),fill='#4b5c56',width=2)
    elif f in (4,10):
        q.rectangle((5,22,27,42),fill='#8a6e4a',outline='#c1a374');q.line((6,23,26,41),fill='#b79966',width=2);q.line((26,23,6,41),fill='#b79966',width=2)
        if f==10:q.polygon([(6,22),(9,16),(15,19),(20,14),(27,22)],fill='#35363c')
    elif f in (5,28,29,30,31,41,42):
        q.rectangle((8,33,25,43),fill='#88654e');q.line((7,32,26,32),fill='#b29265',width=2)
        for i,(x,y) in enumerate([(9,30),(17,23),(24,29),(13,17),(20,12)]):
            q.line((16,36,x,y),fill='#55784d',width=2);q.polygon([(x-4,y-2),(x+1,y-5),(x+4,y),(x,y+3)],fill=['#688c5a','#8b9e63','#597e59'][i%3])
            if f in (5,30,31):q.rectangle((x,y-4,x+2,y-2),fill='#cba1c9' if f!=30 else '#9cd8ce')
        if f==42:q.arc((2,0,30,40),180,360,fill=GOLD,width=3)
        if f==41:q.rectangle((11,8,24,19),fill='#9c845b');q.ellipse((15,11,20,16),fill=INK)
    elif f==6:q.polygon([(3,26),(26,23),(30,40),(6,44)],fill='#936974',outline=GOLD);q.line((6,29,26,26),fill='#d5b992')
    elif f==8:
        q.polygon([(3,24),(27,24),(31,27),(22,31),(20,35),(25,40),(8,40),(11,34),(7,30),(1,28)],fill='#6e8180');q.line((4,25,26,25),fill='#bac2a7',width=2)
    elif f in (11,18,19,20,46):
        for x,y in [(5,30),(15,29),(11,22)]:
            if f==11:q.polygon([(x,y),(x+8,y),(x+11,y+5),(x-2,y+5)],fill='#b2b3a0',outline='#596967')
            elif f==18:q.ellipse((x,y-2,x+12,y+12),fill='#b49d6c',outline='#66583e');q.line((x+4,y,x+10,y),fill=GOLD)
            else:q.ellipse((x,y,x+11,y+7),fill='#c6a268' if f==46 else '#8d9c66' if f==19 else '#79a6a0');q.line((x+2,y+2,x+8,y+2),fill='#e0c28a')
    elif f in (12,13,37):
        q.rectangle((5,25,26,36),fill='#8a694c');q.line((8,25,24,33),fill=GOLD,width=2)
        for x in [8,25]:q.ellipse((x-4,34,x+3,43),fill='#35433e',outline='#a48d61',width=2)
        q.line((25,27,31,21),fill='#b09567',width=2)
    elif f==14:
        q.rectangle((4,16,7,43),fill=WOOD);q.rectangle((26,16,29,43),fill=WOOD);q.rectangle((3,22,30,25),fill='#bda477')
        for x in [10,17,24]:q.line((x,9,x,33),fill='#a5bdb4',width=2);q.line((x-3,30,x+3,30),fill=GOLD,width=2);q.line((x,32,x,38),fill=WOOD,width=2)
    elif f==15:
        q.line((9,26,5,43),fill=WOOD,width=3);q.line((23,26,27,43),fill=WOOD,width=3)
        for r,c in [(12,'#c3b489'),(9,'#935a53'),(6,'#e0d1a3'),(3,'#697e78')]:q.ellipse((16-r,21-r,16+r,21+r),fill=c)
    elif f==16:q.rectangle((14,12,18,43),fill=WOOD);q.line((1,19,31,19),fill=GOLD,width=2);q.line((1,30,31,30),fill=GOLD,width=2)
    elif f==17:q.rectangle((5,24,28,41),fill='#b69f61',outline='#d3bd7d');q.line((13,24,13,41),fill=WOOD);q.line((21,24,21,41),fill=WOOD)
    elif f in (21,24):
        q.line((3,16,29,16),fill=GOLD,width=2);q.line((4,16,4,43),fill=WOOD,width=2);q.line((28,16,28,43),fill=WOOD,width=2)
        for x,c in [(7,'#749a8a'),(15,'#c1a475'),(22,'#997986')]:q.rectangle((x,19,x+5,36),fill=c);q.line((x,19,x+5,19),fill=GOLD)
    elif f==22:q.rectangle((14,15,18,43),fill=WOOD);q.polygon([(7,18),(16,16),(26,20),(28,32),(6,32)],fill='#bcaa7e',outline='#655b49');q.line((9,21,22,28),fill='#7a986f',width=2)
    elif f==23:q.rectangle((14,23,18,43),fill=WOOD);q.ellipse((6,10,26,30),fill='#a1afa5',outline=GOLD);q.rectangle((10,22,23,29),fill=INK);q.line((16,11,16,22),fill=GOLD,width=2)
    elif f==25:
        for x in [6,19]:q.rectangle((x,22,x+6,35),fill='#876b4b');q.rectangle((x-1,34,x+9,41),fill='#b29565');q.line((x,25,x+6,25),fill=GOLD)
    elif f==26:
        for y in [20,33]:
            q.line((3,y+9,29,y+9),fill=GOLD,width=2)
            for x in [6,15,24]:q.rectangle((x,y,x+2,y+3),fill=GOLD);q.ellipse((x-2,y+3,x+4,y+8),fill=['#a56c80','#779e9c','#a5a567'][(x//8)%3])
    elif f==27:
        q.ellipse((3,18,29,43),fill='#36494b',outline='#929b83',width=2);q.ellipse((3,16,29,27),fill='#9b91b1',outline=GOLD,width=2);q.line((9,41,7,46),fill=WOOD,width=3);q.line((25,41,27,46),fill=WOOD,width=3)
    elif f in (32,34,43,44):
        q.polygon([(10,8),(20,6),(26,38),(29,43),(3,43),(7,36)],fill='#5e7b75',outline='#b4b7a0');q.line((15,15,20,21,13,26,19,32),fill='#aaccc0',width=2)
        if f==44:banner(q,10,8,'#81634f',True)
        if f==43:q.line((10,19,23,26),fill=INK,width=2)
    elif f==33:q.polygon([(16,5),(25,20),(21,32),(16,38),(8,28),(6,18)],fill='#7fc7be',outline='#c3e3c8');q.line((15,7,12,25,16,34),fill='#d7ecd0',width=2)
    elif f==36:
        q.line((1,12,31,14),fill=GOLD);q.rectangle((1,12,3,43),fill=WOOD);q.rectangle((29,14,31,43),fill=WOOD)
        for x,c in [(5,'#a6b5a3'),(14,'#a77d7c'),(23,'#748d9a')]:q.rectangle((x,16,x+6,31),fill=c)
    elif f==38:q.ellipse((7,26,23,40),fill='#80998c');q.line((21,30,30,21),fill=GOLD,width=3);q.arc((1,25,13,37),90,270,fill=GOLD,width=2)
    elif f==40:brick(q,(3,22,29,42),['#606f63','#87927a','#aab394','#c9c6a4']);q.ellipse((2,17,30,29),fill='#819887',outline=GOLD,width=2);q.ellipse((7,20,25,25),fill='#365453')
    elif f==45:
        for a,b in [((5,39),(27,29)),((5,29),(27,39))]:q.line((a,b),fill=WOOD,width=4);q.line((a,b),fill='#b08b58')
        q.polygon([(10,35),(8,26),(14,16),(15,26),(21,20),(24,34),(17,40)],fill='#d17c42');q.polygon([(13,35),(16,25),(20,35),(16,39)],fill='#f2c77b')
    elif f==47:brick(q,(10,12,24,43),['#544b47','#706358','#8f7a63','#b39c77']);q.rectangle((7,10,27,15),fill='#bdab83')
    else:
        brick(q,(0,24,31,43),['#4f5d54','#728072','#94a18b','#b6b69a'])
        if f%2:q.line((0,26,31,26),fill=GOLD,width=2)
    props.alpha_composite(im,((f%8)*32,(f//8)*48))
png('city-props',props)
lore=props.crop((7*32,4*48,8*32,5*48));png('city-lore',lore);buildings['city-lore']=lore

# Wind has four integer-pixel frames, never a subpixel wobble or stretched canopy.
trees,d=canvas(384,384)
for kind in range(3):
    for frame in range(4):
        im,q=canvas(96,128);rng=random.Random(811+kind)
        q.ellipse((18,111,79,126),fill='#25372f');q.polygon([(41,64),(55,65),(56,112),(66,120),(51,123),(43,113),(30,121),(27,116),(40,105)],fill='#534535');q.line((47,66,48,111,54,120),fill='#aa8657',width=3)
        for i,(x,y,r) in enumerate([(47,28,25),(25,47,22),(68,47,22),(35,70,25),(64,75,23),(49,51,28)]):
            x+=([0,1,0,-1][frame] if i%2 else 0)
            if kind==1:y+=i*2-8;r-=2
            poly=[(x-r,y-3),(x-r+5,y-r//2),(x-8,y-r),(x+8,y-r+2),(x+r-3,y-9),(x+r,y+7),(x+r-7,y+r-3),(x,y+r),(x-r+3,y+r//2)]
            q.polygon(poly,fill='#263e35');q.polygon([(a+2 if a<x else a-2,b-2) for a,b in poly],fill=['#476847','#3e6655','#647445'][kind])
            for _ in range(130):
                xx,yy=x+rng.randrange(-r+4,r-3),y+rng.randrange(-r+4,r-3)
                if ((xx-x)/r)**2+((yy-y)/r)**2<0.72:q.line((xx,yy,xx+2,yy),fill=rng.choice(['#648349','#80965a','#3c5c40','#a2a56b']))
            if kind==2:q.rectangle((x-6,y+2,x-3,y+5),fill='#c49b62')
        trees.alpha_composite(im,(frame*96,kind*128))
png('city-trees',trees)

# Occupation residents reuse the original modular anatomy, with original clothes and held props.
spec=importlib.util.spec_from_file_location('anatomy',ROOT/'scripts/character-layers.py');anatomy=importlib.util.module_from_spec(spec);spec.loader.exec_module(anatomy)
residents,d=canvas(768,48*len(CITY['npcs']))
for row,npc in enumerate(CITY['npcs']):
    char=['sentinel','strider','wanderer'][row%3];outfit=['ember','tide','moss'][row%3]
    for dr,direction in enumerate(anatomy.DIRECTIONS):
        for col,pose in enumerate([0,4,6,8]):
            im=Image.new('RGBA',(48,48))
            for part in ['back-'+outfit,'body','skin-'+['warm','umber','pale'][row%3],'pants-forest','boots-forest-0','inner-'+outfit,'face-calm','hair-'+['short','braid','crest'][row%3]]:im.alpha_composite(anatomy.draw_layer(char,part,direction,pose))
            q=ImageDraw.Draw(im);bob=anatomy.frame_geometry(char,pose)[1]
            if row in (0,2,6):q.rectangle((19,24+bob,28,32+bob),fill=['#997454','#7c9063','#d3c49b'][[0,2,6].index(row)]);q.line((21,24+bob,21,31+bob),fill='#d2b78b')
            if row in (1,3):q.rectangle((32,24+bob,39,30+bob),fill='#d7c79c');q.line((34,26+bob,37,26+bob),fill='#8c9277')
            if row==4:q.line((35,19+bob,35,37+bob),fill='#a9b5a2',width=2)
            residents.alpha_composite(im,((dr*4+col)*48,row*48))
png('city-residents',residents)

fx,d=canvas(256,336)
for kind in range(7):
    for f in range(8):
        im,q=canvas(32,48);rng=random.Random(kind*50+f)
        if kind==0:
            q.polygon([(5,41),(8,28),(13,21-f%3),(14,32),(20,14+f%4),(22,28),(27,37),(22,43),(11,45)],fill='#b9693d');q.polygon([(10,40),(14,27),(17,34),(21,26),(24,39),(17,44)],fill='#efa657');q.polygon([(14,40),(18,32),(21,41),(17,44)],fill='#f4d48a')
        elif kind==1:
            for i in range(4):
                y=36-((i*8+f*3)%32);x=16+int(math.sin(i+f/3)*4);q.rectangle((x-3-i,y-2,x+4+i,y+3),fill=['#7e8277','#8c8d7a','#5c6a65','#a1a18b'][i])
        elif kind==2:
            for y in range(29,45,5):
                x=(f*2+y)%8;q.line((x,y,x+14,y),fill='#8abfb0');q.point((x+2,y+1),fill='#cfdfbd')
        elif kind==3:
            q.arc((3,4,29,45),f*45,f*45+230,fill='#9addcf',width=2);q.arc((6,7,26,42),180-f*40,360-f*40,fill='#6cb1b3')
            for i in range(7):x=rng.randrange(8,24);y=rng.randrange(10,40);q.rectangle((x,y,x+1,y+1),fill='#b6e1d0')
        elif kind==4:
            for i in range(4):x=8+i*5;y=24-(f+i*2)%15;q.rectangle((x,y,x+2,y+2),fill='#b6cda4' if i%2 else '#baa2cc')
        elif kind==5:
            for i in range(5):x=6+i*5;y=20+int(math.sin(f+i)*3);q.point((x,y),fill='#d9b9d2')
        else:
            q.line((6,7,27,7),fill=GOLD,width=2)
            q.polygon([(10,8),(23,8),(23+f%2,35),(17,31),(10,36)],fill='#51758b')
            q.line((12,9,12+(f%2),31),fill='#93adad')
            q.polygon([(17,14),(20,19),(17,24),(14,19)],fill='#d9bd87')
        fx.alpha_composite(im,(f*32,kind*48))
png('city-fx',fx)

# The same material masks produce the playable tile layers and the navigable overview.
w,h=CITY['width']//2,CITY['height']//2
mask=Image.new('L',(w,h),0);md=ImageDraw.Draw(mask)
mat_index={name:i for i,name in enumerate(materials)}
def coords(points):return [(p['x']//2,p['y']//2) if isinstance(p,dict) else (p[0]//2,p[1]//2) for p in points]
for district in CITY['districts']:
    material='garden' if district['material']=='garden' else 'grass'
    md.polygon(coords(district['polygon']),fill=mat_index[material])
for yard in CITY['yards']:
    box=(yard['x']//2,yard['y']//2,(yard['x']+yard['w'])//2,(yard['y']+yard['h'])//2)
    (md.ellipse if yard['shape']=='ellipse' else md.rectangle)(box,fill=mat_index[yard['material']])
for road in CITY['roads']:
    points=coords(road['points']);width=road['width']//2
    md.line(points,fill=mat_index[road['material']],width=width)
    for x,y in points:md.ellipse((x-width//2,y-width//2,x+width//2,y+width//2),fill=mat_index[road['material']])
for water in CITY['water']:
    x,y,ww,hh=(water[k]//2 for k in ('x','y','w','h'));md.rectangle((x,y,x+ww-1,y+hh-1),fill=8)
for bridge in CITY['bridges']:
    x,y,ww,hh=(bridge[k]//2 for k in ('x','y','w','h'));md.rectangle((x,y,x+ww-1,y+hh-1),fill=5)
layers={name:[] for name in ['ground','terrain','structures','foreground','collision']}
rng=random.Random(12417)
allsolids=[l['solid'] for l in CITY['landmarks'] if 'solid' in l]+[s['solid'] for s in CITY['structures']]+[p['solid'] for p in CITY['props'] if 'solid' in p]+CITY['water']+CITY['rails']+CITY['boundaries']+CITY['portalFeet']+[f for a in CITY['arcades'] for f in a['feet']]
overview=Image.new('RGBA',(w,h))
for row in range(CITY['rows']):
    rows={name:[] for name in layers}
    for col in range(CITY['columns']):
        x,y=col*16,row*16;material=mask.getpixel((x+8,y+8));tile=material*4+rng.randrange(4)
        rows['ground'].append(tile if material!=8 else rng.randrange(4));rows['terrain'].append(tile if material==8 else -1)
        edge=64+(row+col)%2 if material in (1,2,7,12,13) and row>0 and mask.getpixel((x+8,y-8))==0 else -1
        rows['structures'].append(edge)
        fg=68+rng.randrange(4) if material in (0,4) and rng.random()<.12 else -1;rows['foreground'].append(fg)
        blocked=any(x*2+16>s['x'] and x*2+16<s['x']+s['w'] and y*2+16>s['y'] and y*2+16<s['y']+s['h'] for s in allsolids);rows['collision'].append(76 if blocked else -1)
        for index in [rows['ground'][-1],rows['terrain'][-1],edge,fg]:
            if index>=0:overview.alpha_composite(tiles.crop(((index%8)*16,(index//8)*16,(index%8+1)*16,(index//8+1)*16)),(x,y))
    for name in layers:layers[name].append(rows[name])
data=dict(schema=CITY['schema'],tileSize=16,scale=2,columns=CITY['columns'],rows=CITY['rows'],layers=layers)
emit('public/assets/haven/city-map.json',(json.dumps(data,separators=(',',':'))+'\n').encode())

# Rail art and collision share the same visible segments, including every gate gap.
od=ImageDraw.Draw(overview)
for rail in CITY['rails']:
    x,y,ww,hh=(rail[k]//2 for k in ('x','y','w','h'));od.rectangle((x,y,x+ww,y+hh),fill='#8b7954');od.line((x,y,x+ww,y+hh),fill='#c6ab78',width=2)
for wall in CITY['boundaries']:
    x,y,ww,hh=(wall[k]//2 for k in ('x','y','w','h'));od.rectangle((x,y,x+ww,y+hh),fill='#596e67');od.line((x,y,x+ww,y),fill='#b5b99a',width=2)
objects=[]
for l in CITY['landmarks']+CITY['structures']+CITY['arcades']:
    art=l['art'];im=buildings.get(art)
    if im is None:
        path=OUT/(art+'.png')
        if path.exists():im=Image.open(path).convert('RGBA');im=im.crop((0,0,im.height,im.height)) if art=='npc' else im
    if im:objects.append((l['y'],l['x']//2-im.width//2,l['y']//2-im.height,im))
for p in CITY['props']:
    f=p['frame'];im=trees.crop((0,(f-56)*128,96,(f-55)*128)) if f>=56 else props.crop(((f%8)*32,(f//8)*48,(f%8+1)*32,(f//8+1)*48))
    objects.append((p['y'],p['x']//2-im.width//2,p['y']//2-im.height,im))
for _,x,y,im in sorted(objects,key=lambda o:o[0]):overview.alpha_composite(im,(x,y))
png('terrain',overview.resize((CITY['width']//4,CITY['height']//4),Image.Resampling.NEAREST))
emit('art/haven-city/palette.json',(json.dumps(dict(materials=dict(zip(materials,palettes))),indent=2)+'\n').encode())
emit('public/assets/haven/city-atlas.json',(json.dumps(dict(schema=2,tiles=dict(path='city-tiles.png',cell=[16,16],columns=8,frames=80),props=dict(path='city-props.png',cell=[32,48],columns=8,frames=64),trees=dict(path='city-trees.png',cell=[96,128],columns=4,frames=12),residents=dict(path='city-residents.png',cell=[48,48],columns=16,frames=16*len(CITY['npcs'])),effects=dict(path='city-fx.png',cell=[32,48],columns=8,frames=56)),indent=2)+'\n').encode())
emit('art/haven-city/LICENSE.md',b'Original NowRift nine-district environment art and procedural sources. CC0 1.0. No reference-image pixels, copyrighted sprites, samples or third-party maps are included.\n')
for path,data in outputs.items():
    if args.check:
        if not path.exists() or path.read_bytes()!=data:raise SystemExit('Stale city asset: '+str(path.relative_to(ROOT)))
    else:path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
print(('Verified' if args.check else 'Generated')+f' {len(outputs)} original city outputs, five tile layers, 9 district identities and {len(CITY["npcs"])} occupation residents.')
