"""Original CC0 Rift Haven town kit. Pillow is needed only to regenerate committed PNGs.
Reference mood: inhabited woodland town; no reference-image pixels are used.
"""
from PIL import Image, ImageDraw
from pathlib import Path
import random, math, importlib.util
_spec=importlib.util.spec_from_file_location('character_art', Path(__file__).with_name('character-art.py')); _art=importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_art)
R = random.Random(815)
OUT = Path('public/assets/haven'); OUT.mkdir(parents=True, exist_ok=True)
def save(im, name): im.save(OUT / (name + '.png'))
ground = Image.new('RGB', (900,750), '#344537'); d = ImageDraw.Draw(ground)
for _ in range(38000):
    x,y=R.randrange(900),R.randrange(750)
    d.point((x,y),R.choice(['#344b38','#3d503c','#293f33','#45583c','#2e4537']))
# Organic cobbled streets join every entrance, with raised moss-edged curbs.
routes=[[(450,65),(450,690)],[(90,280),(770,280)],[(140,510),(740,510)],[(180,220),(180,650)],[(650,200),(650,665)],[(350,200),(350,650)],[(420,450),(530,450)],[(620,550),(890,550)]]
for route in routes:
    d.line(route,fill='#28382e',width=65);d.line(route,fill='#87816a',width=57);d.line(route,fill='#676a59',width=49)
for y in range(20,735,9):
    for x in range(20,885,11):
        xx=x+(5 if y//9%2 else 0)
        if ground.getpixel((min(899,xx),y))== (103,106,89):
            c=R.choice(['#777b65','#6e745f','#7e8069','#636e5b','#888871'])
            d.rounded_rectangle((xx,y,xx+9,y+7),radius=1,fill=c)
            d.line((xx+1,y,xx+7,y),fill='#92917a')
# River and a wooden bridge.
d.rectangle((840,0,877,750),fill='#244c4d')
for y in range(0,750,6):
    d.line((844+R.randrange(7),y,871-R.randrange(8),y),fill=R.choice(['#396367','#2d575a','#477578']))
for x in [837,878]:d.line((x,0,x,750),fill='#6d7760',width=4)
d.rectangle((830,510,888,565),fill='#493f32')
for y in range(512,564,5):d.rectangle((831,y,887,y+3),fill=R.choice(['#92876b','#a49674','#7f785e']))
for x in [831,885]:d.line((x,507,x,568),fill='#c0ab80',width=3)
# Garden beds, clipped shrubs and warm flowers.
for x,y in [(240,320),(575,330),(270,530),(525,610),(420,655),(735,615),(115,380),(550,150)]:
    d.ellipse((x-30,y-20,x+30,y+20),fill='#222f2a',outline='#8b8a6b',width=3)
    for _ in range(100):
        xx,yy=x+R.randrange(-23,24),y+R.randrange(-13,14)
        d.rectangle((xx,yy,xx+2,yy+2),fill=R.choice(['#627c45','#4d693d','#304d33','#a8a264','#d0b875','#b26764']))
save(ground,'terrain')

def building(name, roof, sign, variant=0):
    im=Image.new('RGBA',(150,160));q=ImageDraw.Draw(im)
    q.ellipse((3,128,149,157),fill='#101f2480')
    # Raised foundation, plaster wall and timber framing.
    q.polygon([(19,67),(124,67),(132,142),(12,142)],fill='#313c36')
    q.rectangle((17,68,128,139),fill='#b6a184')
    for y in range(75,140,7):
        for x in range(18,128,13):q.line((x+(6 if y%2 else 0),y,x+10,y),fill='#9c8b73')
    for x in [18,47,98,126]:q.rectangle((x,68,x+4,140),fill='#594839');q.line((x+1,68,x+1,139),fill='#8b7054')
    q.rectangle((16,95,130,100),fill='#65523d')
    q.line((21,72,46,94),fill='#64503c',width=3);q.line((102,94,125,72),fill='#64503c',width=3)
    # Deep pitched roof with individual overlapping shingles.
    q.polygon([(7,74),(33,13),(114,13),(146,74)],fill='#28332f')
    for row,y in enumerate(range(17,73,6)):
        left=31-int((y-17)*.38);right=116+int((y-17)*.42)
        for x in range(left,right,9):
            q.rectangle((x,y,min(x+8,right),y+5),fill=R.choice(roof))
            q.line((x+1,y,x+6,y),fill=roof[-1]);q.line((x+8,y+1,x+8,y+4),fill=roof[0])
    q.line((8,74,145,74),fill='#cfb88c',width=3);q.line((33,12,113,12),fill='#4a4536',width=3)
    # Dormer and chimney.
    q.rectangle((28,7,40,32),fill='#81765e');q.rectangle((26,6,42,10),fill='#c0ab88')
    q.polygon([(63,48),(73,30),(87,48)],fill='#443f32');q.rectangle((65,47,85,66),fill='#d3b994')
    q.rectangle((70,48,80,61),fill='#304a4c');q.line((75,49,75,60),fill='#c5b784')
    # Warm glazed windows and arched doorway.
    for x in [28,105]:
        q.rectangle((x-3,106,x+17,125),fill='#514b36');q.rectangle((x,108,x+13,122),fill='#507273')
        q.rectangle((x+1,109,x+6,116),fill='#d4ba7a');q.line((x+7,108,x+7,122),fill='#bcac87')
        q.rectangle((x-4,124,x+17,128),fill='#7c694d')
        for i in range(10):q.point((x+R.randrange(-2,17),125+R.randrange(3)),fill='#687e49')
    q.rounded_rectangle((60,101,89,141),radius=13,fill='#c3ae85');q.rounded_rectangle((65,105,85,141),radius=8,fill='#4c4b39')
    for x in range(67,85,4):q.line((x,116,x,139),fill='#796448')
    q.ellipse((79,124,81,126),fill='#e4c481')
    q.rectangle((57,141,92,144),fill='#b0a18a');q.rectangle((54,145,96,148),fill='#827d69')
    # Painted shop sign and lantern.
    q.rectangle((42,82,101,94),fill='#343f35',outline='#d4bb84')
    if sign=='anvil':q.polygon([(66,86),(82,86),(85,88),(78,89),(78,91),(68,91),(68,89),(63,88)],fill='#cbb88d')
    elif sign=='leaf':q.ellipse((68,84,81,92),fill='#9db78a');q.line((68,93,80,85),fill='#d6d6a2')
    elif sign=='moon':q.ellipse((68,84,79,93),fill='#e0ca9a');q.ellipse((72,82,82,90),fill='#343f35')
    elif sign=='bottle':q.rectangle((72,84,75,86),fill='#d5b995');q.ellipse((69,86,79,92),fill='#9bc6bd')
    else:q.rectangle((68,85,81,91),fill='#c2a16d');q.line((74,85,74,91),fill='#6e6144')
    q.rectangle((135,94,136,113),fill='#443d30');q.rectangle((130,100,140,111),fill='#b99153',outline='#d0bd86');q.rectangle((133,102,138,109),fill='#f2d78e')
    if variant==1:
        q.polygon([(15,101),(53,101),(57,117),(10,117)],fill='#8d554b')
        for x in range(15,54,8):q.polygon([(x,102),(x+4,102),(x+4,116),(x-3,116)],fill='#d0b184')
        q.rectangle((13,118,49,139),fill='#786149')
        for x in range(17,48,7):q.ellipse((x,123,x+5,129),fill=R.choice(['#ad9f54','#b46350','#6f8d51']))
    if variant==2:
        q.rectangle((19,130,44,142),fill='#4e5550');q.ellipse((21,126,42,136),fill='#ea985c');q.rectangle((25,130,38,137),fill='#ffdb85')
    # Ivy and small planters make silhouettes feel inhabited.
    for _ in range(55):
        x=R.choice([19,120])+R.randrange(-5,6);y=R.randrange(77,142)
        q.rectangle((x,y,x+2,y+2),fill=R.choice(['#486145','#71834c','#7e8d55']))
    for x in [7,132]:
        q.rectangle((x,137,x+12,146),fill='#886347');q.ellipse((x-3,129,x+15,140),fill='#4d6b43')
        for i in range(4):q.point((x+R.randrange(10),R.randrange(132,139)),fill='#c6ad7d')
    save(im,name)
for name,roof,sign,v in [
 ('forge',['#513e37','#7a5546','#94634e','#b27e5c'],'anvil',2),
 ('workshop',['#364942','#52675c','#718373','#9a9d81'],'leaf',0),
 ('wardrobe',['#41484d','#596875','#78868a','#a4aaa0'],'moon',0),
 ('market',['#593f3b','#855c4e','#a6745a','#c99771'],'leaf',1),
 ('inn',['#56463a','#8d674d','#aa805b','#c8a276'],'bottle',1),
 ('store',['#3e4442','#5d675d','#788472','#9c9d7f'],'box',0)]: building(name,roof,sign,v)

im=Image.new('RGBA',(100,100));q=ImageDraw.Draw(im)
q.ellipse((3,61,97,96),fill='#15272a80');q.ellipse((5,41,95,90),fill='#5b655c',outline='#b0a582',width=3);q.ellipse((10,44,90,82),fill='#406b67',outline='#d2c49d',width=3)
for i in range(28):
    a=i*math.pi/14;x,y=50+math.cos(a)*33,62+math.sin(a)*14;q.line((x,y,x+4,y),fill='#8db0a0')
q.rectangle((45,27,55,65),fill='#b7af8a');q.ellipse((28,23,72,41),fill='#c3b58e',outline='#6e7966',width=2);q.ellipse((31,24,69,35),fill='#73998a')
q.rectangle((47,9,53,28),fill='#c6bd98');q.ellipse((43,3,57,14),fill='#ded0a3');q.line((50,12,50,55),fill='#a8d1b8',width=2);save(im,'fountain')
im=Image.new('RGBA',(90,105));q=ImageDraw.Draw(im)
q.ellipse((2,77,88,103),fill='#344f48',outline='#a3ad83',width=3);q.ellipse((15,10,75,94),fill='#253f43',outline='#7e8b77',width=8);q.ellipse((25,19,65,84),fill='#386f70',outline='#b4c6a0',width=2)
q.ellipse((31,25,59,78),fill='#699f91');q.line([(47,26),(36,43),(49,54),(40,76)],fill='#dbefd0',width=3)
for x,y in [(18,20),(68,22),(14,61),(70,65)]:q.rectangle((x,y,x+6,y+7),fill='#d6c08a')
save(im,'portal')
for name in ['board','dummy','chest']:
    im=Image.new('RGBA',(42,54));q=ImageDraw.Draw(im);q.ellipse((2,43,41,53),fill='#172a2680')
    if name=='board':
        for x in [9,32]:q.rectangle((x,12,x+3,49),fill='#775e45')
        q.rectangle((3,8,39,36),fill='#604d37',outline='#bca375',width=2)
        for x,y in [(8,13),(23,16),(13,25)]:q.rectangle((x,y,x+10,y+8),fill='#d0c097');q.line((x+2,y+3,x+8,y+3),fill='#8c7956')
    elif name=='dummy':
        q.rectangle((19,10,23,49),fill='#8b7653');q.rectangle((4,24,38,28),fill='#a08a5d');q.ellipse((12,5,30,23),fill='#bbab71',outline='#716b49');q.polygon([(11,23),(31,23),(35,41),(8,41)],fill='#997854');q.line((12,32,30,32),fill='#d0b280',width=3)
    else:
        q.rounded_rectangle((4,22,38,46),radius=6,fill='#91724e',outline='#c1a477',width=2);q.rectangle((5,32,37,45),fill='#6d513d');q.line((7,33,35,33),fill='#d5b879',width=2);q.rectangle((18,29,24,37),fill='#cdb578')
    save(im,name)
# Original player poses with three authored cloak palettes, shared animation grid.
source=Image.open('public/assets/forest/player.png').convert('RGBA')
for name in _art.PALETTES:
    skin=Image.new('RGBA',(320,32))
    for frame,pose in enumerate([0,2,3,4,6,8,10,11,1,5]):skin.alpha_composite(_art.body('wanderer',name,'down',pose),(frame*32,0))
    save(skin,'player-'+name)
save(source,'npc')
# A separate broadleaf tree kit gives the town a softer, inhabited canopy.
tr=random.Random(1907)
tree=Image.new('RGBA',(80,104));td=ImageDraw.Draw(tree)
td.ellipse((8,84,74,102),fill='#142b2766')
td.polygon([(32,53),(47,51),(49,91),(59,96),(45,98),(39,89),(28,97),(22,94),(33,85)],fill='#4d4432')
td.line([(39,58),(40,91),(45,96)],fill='#9a8054',width=3)
td.line([(41,68),(24,48)],fill='#6c5a3d',width=4)
for cx,cy,rx,ry in [(39,23,23,21),(22,35,19,22),(57,37,21,22),(30,55,24,24),(53,59,23,24),(41,40,25,23)]:
    td.ellipse((cx-rx,cy-ry,cx+rx,cy+ry),fill='#203e30')
    td.ellipse((cx-rx+2,cy-ry+1,cx+rx-2,cy+ry-4),fill='#3d6139')
    for _ in range(115):
        x=cx+tr.randrange(-rx+3,rx-2);y=cy+tr.randrange(-ry+3,ry-2)
        if ((x-cx)/rx)**2+((y-cy)/ry)**2<.85:
            td.rectangle((x,y,x+tr.randrange(1,4),y+1),fill=tr.choice(['#4d713e','#5d7f45','#3b5c35','#708d50','#8c9b5b']))
save(tree,'tree')
(OUT/'LICENSE.md').write_text('Original NowRift procedural pixel-art town kit, created for this project. CC0 1.0. No pixels from reference images or third-party game assets are included. Regenerate with scripts/generate-haven.py (Pillow).\n')
print('Generated Rift Haven terrain, buildings, stations and appearance sheets.')
