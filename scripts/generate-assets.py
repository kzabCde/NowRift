"""Generate original NowRift pixel art; no downloaded or third-party game art.
Requires Pillow only when regenerating. Generated PNGs are committed.
"""
from PIL import Image, ImageDraw
from pathlib import Path
import random, math, importlib.util
_spec=importlib.util.spec_from_file_location('character_art', Path(__file__).with_name('character-art.py')); _art=importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_art)
out=Path('public/assets/forest');out.mkdir(parents=True,exist_ok=True)
def rect(d,box,c):d.rectangle(tuple(round(v) for v in box),fill=c)
def sprite(kind,frame):
    size=64 if kind=='boss' else 32
    im=Image.new('RGBA',(size,size));d=ImageDraw.Draw(im)
    bob=[0,-1,0,1,0,0,2,4,-1,0][frame]; cx=size//2; cy=size//2+bob
    dead=6<=frame<=7
    if kind=='player' and dead: return _art.body('wanderer','moss','down',10 if frame==6 else 11)
    if dead:
        if kind=='player':
            rect(d,(8,22,25,25),'#273c40');rect(d,(11,20,24,23),'#7e4748');rect(d,(8,19,13,22),'#c7b8a2')
        else:
            d.ellipse((cx-10,cy+3,cx+11,cy+9),fill='#364b38');rect(d,(cx-7,cy+3,cx+5,cy+5),'#8b9b64')
        return im
    if kind=='player':
        return _art.body('wanderer','moss','down',[0,2,3,4,6,8,10,11,1,5][frame])
    elif kind=='slime':
        d.ellipse((6,cy-6,26,cy+10),fill='#243d34');d.ellipse((7,cy-7,25,cy+7),fill='#67895b');rect(d,(10,cy-6,19,cy-3),'#a0b97a');rect(d,(7,cy+7,26,cy+9),'#344f3d')
        rect(d,(12,cy,13,cy+2),'#152b2b');rect(d,(20,cy,21,cy+2),'#152b2b');rect(d,(13,cy,13,cy),'#d4e7b2')
    elif kind=='wolf':
        d.polygon([(4,cy+3),(6,cy-3),(13,cy-7),(23,cy-5),(29,cy),(25,cy+5),(12,cy+7)],fill='#708789')
        d.polygon([(6,cy-3),(2,cy-7),(3,cy+3),(11,cy+2)],fill='#384f59');rect(d,(10,cy-2,23,cy+1),'#a6b5ac')
        d.polygon([(20,cy-5),(21,cy-12),(25,cy-5)],fill='#4a626c');rect(d,(25,cy-2,27,cy-1),'#f5d291');rect(d,(28,cy+1,30,cy+3),'#273d47')
        rect(d,(10,cy+5,13,cy+11-(frame%2)*3),'#4a626c');rect(d,(22,cy+5,25,cy+11-((frame+1)%2)*3),'#4a626c')
    elif kind=='goblin':
        rect(d,(10,cy+4,13,cy+12-frame%2*2),'#3a5740');rect(d,(20,cy+4,23,cy+10+frame%2*2),'#3a5740')
        rect(d,(10,cy-2,22,cy+6),'#705847');rect(d,(12,cy-3,21,cy+3),'#9d8460')
        rect(d,(10,cy-11,23,cy-4),'#719467');d.polygon([(10,cy-10),(4,cy-13),(8,cy-5)],fill='#719467');d.polygon([(23,cy-10),(28,cy-13),(25,cy-5)],fill='#719467')
        rect(d,(12,cy-8,14,cy-7),'#e8bd76');rect(d,(20,cy-8,22,cy-7),'#e8bd76');rect(d,(26,cy-3,27,cy+9),'#bdc7b1');rect(d,(24,cy+5,29,cy+6),'#9c7850')
    elif kind=='caster':
        d.polygon([(9,cy-4),(23,cy-4),(27,cy+12),(5,cy+12)],fill='#4d4266');d.polygon([(12,cy-4),(20,cy-4),(23,cy+10),(11,cy+10)],fill='#79637e')
        d.polygon([(8,cy-5),(14,cy-14),(20,cy-12),(24,cy-5)],fill='#6c7b61');rect(d,(12,cy-7,21,cy-4),'#273641');rect(d,(13,cy-6,15,cy-5),'#dbb3df');rect(d,(19,cy-6,20,cy-5),'#dbb3df')
        rect(d,(27,cy-8,28,cy+12),'#8b7756');rect(d,(25,cy-12,30,cy-8),'#bd92c5');rect(d,(27,cy-13,28,cy-6),'#efc5dc')
    else:
        scale=2 if kind=='boss' else 1
        # Carved wooden giant, antlers and overgrown stone armor.
        tmp=Image.new('RGBA',(32,32));td=ImageDraw.Draw(tmp)
        rect(td,(9,20,13,29),'#56493e');rect(td,(19,20,24,29),'#56493e');rect(td,(8,27,14,30),'#899378');rect(td,(18,27,25,30),'#899378')
        td.polygon([(8,11),(24,11),(26,23),(7,23)],fill='#606c59');rect(td,(11,12,22,21),'#929477');rect(td,(13,14,20,19),'#42574c');rect(td,(15,15,18,17),'#e7cf83')
        rect(td,(4,12,9,23),'#697c59');rect(td,(24,12,29,23),'#697c59');rect(td,(3,10,10,14),'#a8ac7a');rect(td,(23,10,30,14),'#a8ac7a')
        rect(td,(11,5,22,12),'#514c3b');rect(td,(13,6,21,10),'#929477');rect(td,(13,9,15,10),'#edcb7d');rect(td,(19,9,21,10),'#edcb7d')
        rect(td,(9,2,11,8),'#8d7c55');rect(td,(22,2,24,8),'#8d7c55');rect(td,(5,1,10,3),'#8d7c55');rect(td,(23,1,28,3),'#8d7c55');rect(td,(6,0,7,1),'#b3aa71');rect(td,(27,0,28,2),'#b3aa71')
        for x,y in [(5,13),(25,11),(12,5),(9,24)]:rect(td,(x,y,x+3,y+2),'#789659')
        if scale==2:tmp=tmp.resize((64,64),Image.Resampling.NEAREST)
        im.alpha_composite(tmp,(0,bob))
    if frame==5:
        white=Image.new('RGBA',im.size,'#f6ebce');white.putalpha(im.getchannel('A'));im=Image.blend(im,white,.7)
    return im
for kind in ['player','slime','goblin','wolf','caster','elite','boss']:
    n=64 if kind=='boss' else 32;sheet=Image.new('RGBA',(n*10,n))
    for f in range(10):sheet.paste(sprite(kind,f),(n*f,0))
    sheet.save(out/(kind+'.png'))
# Baked particle colors also work with Phaser's Canvas2D renderer (no GPU tint dependency).
particles=Image.new('RGBA',(32,4))
for i,c in enumerate(['#b7edcb','#ffb369','#b5f1ec','#f19a8b','#ffe09b','#a2bcd3','#bbd397','#e9cf82']):
    pd=ImageDraw.Draw(particles);pd.rectangle((i*4+1,0,i*4+2,3),fill=c);pd.rectangle((i*4,1,i*4+3,2),fill=c);pd.point((i*4+1,1),fill='#fff0c7')
particles.save(out/'particles.png')
# Spell projectiles have a dedicated atlas, separate from the interface icons.
projectiles=Image.new('RGBA',(16*5,16))
# Built after the icon sheet below; the original sprite source is reused intentionally.
# Repeating grass with hand-picked, muted palette.
rng=random.Random(149);im=Image.new('RGB',(256,256),'#26382e');d=ImageDraw.Draw(im)
for i in range(4000):
    x=rng.randrange(128)*2;y=rng.randrange(128)*2;c=rng.choice(['#293d31','#2d4134','#22352d','#304637','#344a39','#273b32']);rect(d,(x,y,x+1,y+1),c)
for i in range(110):
    x=rng.randrange(126)*2;y=rng.randrange(126)*2;rect(d,(x,y,x,y+3),'#486144');rect(d,(x+1,y+2,x+3,y+2),'#3e553e')
im.save(out/'ground.png')
# Large evergreen canopy, trunk base aligns with world collision center.
im=Image.new('RGBA',(64,80));d=ImageDraw.Draw(im)
d.ellipse((13,66,54,78),fill='#15271f88');rect(d,(27,43,36,72),'#443e32');rect(d,(30,43,33,71),'#6f6045')
for i,(x,y,w,h) in enumerate([(29,7,18,22),(21,20,23,25),(36,25,24,24),(17,39,28,24),(37,42,25,22),(29,51,25,20)]):
    d.polygon([(x,y-h//2),(x-w,y+h//2),(x+w,y+h//2),(x+w-3,y+h//2+4),(x-w+3,y+h//2+4)],fill=['#213c30','#294b37','#30513a'][i%3]);d.line([(x,y-h//2+3),(x-w+6,y+h//2-3),(x+w-7,y+h//2-3)],fill='#52704a',width=2)
im.save(out/'tree.png')
im=Image.new('RGBA',(32,24));d=ImageDraw.Draw(im);d.ellipse((0,13,31,23),fill='#18281f99');d.polygon([(1,16),(6,7),(19,3),(28,9),(30,19),(14,22)],fill='#54615a');d.polygon([(6,7),(19,3),(27,9),(18,14),(5,15)],fill='#83907b');d.line([(7,8),(17,6),(21,8)],fill='#a7ad90',width=1);rect(d,(1,16,8,18),'#49613e');im.save(out/'rock.png')
# Spell, weapon, and stat icons on one consistent 16px atlas.
im=Image.new('RGBA',(16*8,16))
for i in range(8):
    t=Image.new('RGBA',(16,16));d=ImageDraw.Draw(t)
    if i==0:
        d.polygon([(8,1),(12,7),(8,14),(3,8)],fill='#78a9b6');d.polygon([(8,3),(10,7),(7,11),(5,8)],fill='#d2f8ed');rect(d,(7,5,8,7),'#f4fff3')
    elif i==1:
        d.polygon([(3,13),(5,8),(13,1),(11,7),(7,11)],fill='#c2c9b2');rect(d,(3,10,6,12),'#e0bb74');rect(d,(2,13,3,14),'#846344');d.line([(7,8),(11,3)],fill='#f1efd3')
    elif i==2:
        d.polygon([(4,14),(1,9),(7,1),(8,6),(12,3),(15,11),(11,15)],fill='#c56345');d.polygon([(5,12),(6,7),(9,9),(11,7),(12,12),(9,14)],fill='#f5ba6c');rect(d,(7,10,9,13),'#ffe6a0')
    elif i==3:
        for a in range(6):
            angle=a*math.pi/3;d.line([(8,8),(8+math.cos(angle)*7,8+math.sin(angle)*7)],fill='#c1eee2',width=1)
        rect(d,(6,6,9,9),'#7fb6ba')
    elif i==4:
        d.polygon([(1,8),(6,4),(10,4),(15,8),(10,12),(6,12)],fill='#b6c492');rect(d,(7,6,9,10),'#edc985');rect(d,(8,7,8,9),'#34413b')
    elif i==5:
        d.polygon([(3,1),(13,1),(12,10),(8,15),(4,10)],fill='#9d7970');d.polygon([(5,3),(11,3),(10,9),(8,12),(6,9)],fill='#e0b77d')
    elif i==6:
        d.polygon([(2,3),(7,3),(8,9),(13,11),(13,14),(3,14)],fill='#859b84');rect(d,(3,3,7,5),'#d2c796');rect(d,(3,12,12,14),'#c0b68a')
    else:
        d.polygon([(1,4),(4,2),(7,3),(8,5),(10,2),(13,2),(15,5),(14,9),(8,15),(2,10)],fill='#c57d77');rect(d,(3,4,5,5),'#f4b1a1')
    im.paste(t,(16*i,0))
im.save(out/'icons.png')
for i in range(4):projectiles.paste(im.crop((16*i,0,16*(i+1),16)),(16*i,0))
thorn=Image.new('RGBA',(16,16));td=ImageDraw.Draw(thorn)
td.polygon([(1,14),(5,7),(9,6),(14,1),(13,7),(9,10),(7,13)],fill='#9c6d9e')
td.line([(3,12),(11,4)],fill='#ecc3dd',width=2);rect(td,(6,5,7,9),'#b992bd')
projectiles.paste(thorn,(64,0));projectiles.save(out/'projectiles.png')
# Hero background, assembled from the same original sprite set.
im=Image.new('RGB',(480,270),'#26382e');im.paste(Image.open(out/'ground.png'),(0,0));im.paste(Image.open(out/'ground.png'),(256,0));d=ImageDraw.Draw(im)
d.polygon([(240,0),(280,0),(210,135),(340,270),(250,270),(170,140)],fill='#555447')
for i in range(220):
    x=rng.randrange(480);y=rng.randrange(270)
    if 190<x<300:continue
    if i%5==0:
        tree=Image.open(out/'tree.png');im.paste(tree,(x-32,y-65),tree)
# Ruined portal with cyan magical center.
d=ImageDraw.Draw(im);d.ellipse((201,58,279,188),fill='#172c29',outline='#7a8470',width=7);d.ellipse((214,73,267,178),fill='#5c9c91',outline='#b4c9a1',width=3);d.ellipse((223,83,257,172),fill='#264f51');d.line([(242,85),(230,117),(246,139),(237,165)],fill='#bdf2d4',width=3)
for x,y in [(203,70),(264,71),(200,141),(268,143)]:rect(d,(x,y,x+7,y+8),'#c2b980')
p=sprite('player',0);im.paste(p,(227,190),p)
im.resize((1440,810),Image.Resampling.NEAREST).save(out/'key-art.png')
print('Generated original forest sprite sheets, scenery, icons and key art.')
