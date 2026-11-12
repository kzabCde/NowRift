"""Original CC0 pixel sprites for NowRift's existing species and biome materials.
All coordinates below are authored pixel clusters, not imported/reference-image pixels.
The runtime's 10-frame grids, pivots and collision footprints are preserved.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import math, random

WORLDS = ('forest','desert','frozen','infernal')
KINDS = ('slime','goblin','wolf','caster','elite','boss')
PALETTES = {
 'forest': ('#182b2a','#3b5944','#6f9061','#c4c28a','#e7d9a8'),
 'desert': ('#382f38','#876145','#c09a62','#e6c588','#fae4ac'),
 'frozen': ('#172e43','#446981','#80b2c4','#b4e7e2','#e7fcf3'),
 'infernal': ('#221f2c','#633e41','#a15b45','#ed9956','#ffe0a0'),
}

def pixel(im, box, color): ImageDraw.Draw(im).rectangle(box,fill=color)
def outlined(im):
    """One hard pixel outline, leaving the authored material highlights intact."""
    a=im.getchannel('A'); edge=Image.new('RGBA',im.size)
    for x,y in [(-1,0),(1,0),(0,-1),(0,1)]:
        colored=Image.new('RGBA',im.size,'#12252b'); colored.putalpha(a)
        edge.alpha_composite(colored,(x,y))
    edge.alpha_composite(im);return edge

def pebble(d,x,y,colors,scale=1):
    dark,mid,light=colors
    d.polygon([(x-3*scale,y),(x-scale,y-3*scale),(x+2*scale,y-2*scale),(x+4*scale,y+scale),(x,y+3*scale)],fill=dark)
    d.line((x-scale,y-2*scale,x+2*scale,y-scale),fill=light,width=scale)
    d.line((x-scale,y+scale,x+2*scale,y+scale),fill=mid,width=scale)

def humanoid(im,world,role,frame,y):
    d=ImageDraw.Draw(im);outline,shade,mid,light,shine=PALETTES[world]
    moving=frame in (1,2,3,9);stride=2 if moving and frame%2 else 0;attack=frame==4
    # Art silhouettes follow actual registry species, not the logical AI key.
    heavy=role in ('knight','golem','guardian'); hood=role in ('archer','mage','bandit')
    wide=3 if heavy else 0
    for x,dy in [(11,stride),(20,2-stride if moving else 0)]:
        d.rectangle((x,y+7,x+3,y+12-dy),fill=shade);d.rectangle((x-1,y+12-dy,x+5,y+14-dy),fill=outline)
        d.line((x,y+11-dy,x+3,y+11-dy),fill=light)
    if role=='goblin':
        d.polygon([(9,y-6),(4,y-10),(6,y-3),(11,y-1),(21,y-1),(26,y-4),(29,y-10),(21,y-6)],fill='#7a925f')
        d.rectangle((11,y-10,22,y-2),fill='#708950');d.rectangle((13,y-9,20,y-7),fill='#a3b77b')
        d.polygon([(10,y-1),(23,y-1),(25,y+8),(8,y+8)],fill='#59493c');d.rectangle((12,y,21,y+6),fill='#a27c56')
        d.line((13,y,20,y+6),fill='#dfc58e',width=2);d.rectangle((9,y+6,24,y+8),fill='#3e3f33')
        d.point((14,y-5),fill='#efd6a1');d.point((21,y-5),fill='#efd6a1');d.line((17,y-1,21,y-1),fill='#39483b')
        hx=27 if not attack else 29;d.rectangle((25,y+2,hx,y+8),fill='#75915d')
        d.polygon([(hx,y+8),(hx-1,y-4 if attack else y+1),(hx-3,y+4)],fill='#d5d8bc');d.line((hx-4,y+6,hx+1,y+6),fill='#ae8051')
        d.rectangle((6,y+1,9,y+5),fill='#75915d')
    elif role in ('knight','guardian'):
        metal='#78909a' if world=='frozen' else '#788268' if world=='forest' else '#715259'
        d.polygon([(9-wide,y-3),(24+wide,y-3),(25,y+9),(8,y+9)],fill=shade)
        d.rectangle((10,y-2,23,y+7),fill=metal);d.polygon([(12,y),(21,y),(20,y+5),(16,y+7)],fill=light)
        d.rectangle((10,y-10,23,y-3),fill=metal);d.polygon([(10,y-11),(16,y-13),(23,y-10)],fill=light)
        d.rectangle((12,y-7,22,y-5),fill=outline);d.point((14,y-6),fill=shine);d.point((21,y-6),fill=shine)
        for x in [4,24]:d.polygon([(x,y-3),(x+4,y-5),(x+5,y+2),(x,y+3)],fill=metal);d.line((x,y-3,x+3,y-3),fill=light)
        d.rectangle((8,y+7,24,y+9),fill=outline);d.rectangle((15,y+7,18,y+8),fill=light)
        if world=='forest':
            for x,yy in [(5,y-2),(20,y-11),(8,y+7)]:d.polygon([(x,yy),(x+3,yy-3),(x+5,yy),(x+3,yy+2)],fill='#91ab62')
            d.line((16,y-2,17,y+5),fill='#e4cb8b');d.line((14,y+1,20,y+1),fill='#e4cb8b')
        elif world=='infernal':
            d.polygon([(11,y-10),(7,y-15),(15,y-12)],fill='#e1b17d');d.polygon([(20,y-12),(26,y-15),(23,y-9)],fill='#e1b17d')
            d.line((16,y,18,y+5,15,y+7),fill='#ffbd67',width=2)
        else:d.polygon([(15,y-12),(17,y-17),(19,y-12)],fill='#b4f4ed')
        # Broad shield and a separate blade/polearm, with attack reach in frame4.
        d.polygon([(3,y+1),(9,y-1),(11,y+5),(7,y+10),(3,y+7)],fill=metal);d.line((5,y+1,6,y+7),fill=light)
        if attack:d.line((22,y,30,y-7),fill=shine,width=2);d.line((22,y+1,27,y+6),fill=mid,width=2)
        else:d.line((27,y-8,27,y+11),fill=light,width=2);d.line((25,y+3,29,y+3),fill=mid,width=2)
    elif role=='golem':
        for x,yy,w,h in [(8,y-7,16,8),(7,y+1,18,10),(2,y-1,5,11),(25,y-2,5,12),(10,y+11,5,4),(20,y+11,5,4)]:
            d.polygon([(x+1,yy),(x+w-1,yy),(x+w,yy+h-2),(x+w-2,yy+h),(x,yy+h-1)],fill=mid)
            d.line((x+2,yy+1,x+w-2,yy+1),fill=light);d.line((x+1,yy+h-1,x+w-2,yy+h-1),fill=shade)
        d.rectangle((12,y-4,14,y-3),fill=shine);d.rectangle((20,y-4,22,y-3),fill=shine)
        d.polygon([(16,y+2),(20,y+6),(16,y+10),(13,y+6)],fill=shade);d.line((16,y+3,17,y+8),fill=shine)
        if world=='infernal':
            d.line((7,y+5,12,y+3,18,y+7,22,y+5),fill='#ffb35c',width=2)
            d.polygon([(10,y-7),(13,y-13),(16,y-7)],fill='#ffbe65')
    else:
        # Cloth-covered figures all have purpose-built silhouette details.
        cloth='#6a5270' if world=='forest' else '#8d5c54' if world=='infernal' else '#827559' if world=='desert' else '#467793'
        d.polygon([(10,y-3),(22,y-3),(27,y+13),(7,y+13)],fill=cloth)
        d.polygon([(13,y-2),(19,y-2),(23,y+11),(11,y+11)],fill=mid)
        for yy in range(y+1,y+11,3):d.line((14,yy,18,yy+1),fill=light)
        d.polygon([(8,y-5),(11,y-12),(19,y-15),(24,y-5)],fill=cloth);d.line((11,y-9,17,y-12,21,y-6),fill=light)
        d.rectangle((12,y-6,22,y-3),fill=outline);d.point((14,y-5),fill=shine);d.point((21,y-5),fill=shine)
        d.rectangle((12,y+6,22,y+8),fill=shade);d.rectangle((16,y+6,18,y+7),fill=light)
        if role=='bandit':
            d.line((11,y-3,22,y+1),fill='#e4c997',width=2);d.rectangle((9,y-10,23,y-8),fill='#ddd0ad')
            d.polygon([(24,y+6),(29,y+2),(30,y-6 if attack else y-1),(27,y+2)],fill=shine)
            d.line((21,y+6,27,y+7),fill='#be8b51',width=2)
        elif role=='archer':
            d.arc((20,y-11,31,y+10),-80,80,fill=light,width=2);d.line((26,y-10,26,y+9),fill='#cab892')
            if attack:d.line((15,y,31,y),fill=shine);d.polygon([(30,y-2),(31,y),(30,y+2)],fill=light)
            d.line((6,y-10,8,y+7),fill=shade,width=3)
            for yy in [y-11,y-8,y-5]:d.line((4,yy,8,yy+4),fill=light)
        else:
            d.line((27,y-12,27,y+12),fill='#a68c64',width=2)
            if world=='forest':
                d.polygon([(23,y-11),(25,y-15),(28,y-13),(30,y-15),(30,y-9),(27,y-7)],fill='#a7b67a')
                d.line((12,y+10,7,y+4),fill='#7b9d61',width=2)
            else:
                d.polygon([(27,y-16),(31,y-11),(27,y-7),(23,y-11)],fill=light);d.point((27,y-11),fill=shine)
        if attack:d.line((8,y+2,3,y-2),fill=light,width=2)

def quadruped(im,world,frame,y,beast=False):
    d=ImageDraw.Draw(im);outline,shade,mid,light,shine=PALETTES[world]
    fur=('#456168','#799295','#c4cfc0') if world=='forest' else ('#456c87','#90b6cb','#d5ebea') if world=='frozen' else ('#50363d','#945344','#dc9964')
    dark,body,high=fur;stride=2 if frame%2 else 0
    d.polygon([(6,y+1),(9,y-5),(20,y-6),(26,y-2),(28,y+3),(23,y+8),(10,y+8)],fill=body)
    d.polygon([(8,y-3),(12,y-6),(20,y-5),(24,y-1),(17,y+1)],fill=high)
    for x,yy in [(9,y+4-stride),(19,y+5),(24,y+3+stride)]:d.rectangle((x,yy,x+2,y+13-(stride if x==19 else 0)),fill=dark);d.line((x,y+12-(stride if x==19 else 0),x+3,y+12-(stride if x==19 else 0)),fill=high)
    d.polygon([(6,y),(2,y-6),(1,y-11),(6,y-6),(11,y-4)],fill=dark)
    d.polygon([(20,y-5),(22,y-13),(25,y-8),(29,y-10),(30,y-2),(27,y+3),(21,y+2)],fill=body)
    d.polygon([(22,y-12),(23,y-9),(25,y-8)],fill=high);d.polygon([(26,y-8),(28,y-9),(28,y-5)],fill=dark)
    d.rectangle((26,y-4,29,y-2),fill=high);d.point((27,y-6),fill=shine);d.point((30,y-3),fill=outline)
    d.line((24,y+1,28,y+1),fill=outline)
    if frame==4:d.polygon([(25,y+1),(31,y+2),(28,y+6),(23,y+3)],fill=dark);d.line((26,y+3,29,y+3),fill=shine)
    if beast:
        for x in range(10,23,4):d.polygon([(x,y-4),(x+1,y-11),(x+4,y-4)],fill='#b46d4a')
        d.line((10,y+1,15,y-1,19,y+4,23,y+2),fill='#f7ac5d',width=2)
    elif world=='frozen':
        for x in [8,13,18]:d.polygon([(x,y-4),(x+2,y-9),(x+4,y-3)],fill='#c4f7ed')
    else:d.line((12,y+2,16,y+3),fill='#3b5a62')

def insect(im,world,role,frame,y):
    d=ImageDraw.Draw(im);dark,shade,mid,light,shine=PALETTES[world];s=frame%2
    for i in range(3):
        yy=y-2+i*4
        d.line((10,yy,4-s,yy+3,2,yy+2),fill=light);d.line((22,yy,28+s,yy+3,30,yy+2),fill=mid)
    d.ellipse((8,y-7,24,y+10),fill=shade);d.polygon([(9,y-3),(12,y-7),(19,y-7),(24,y-2),(22,y+7),(11,y+8)],fill=mid)
    d.line((16,y-6,16,y+7),fill=dark);d.arc((11,y-6,21,y+8),90,270,fill=light)
    for yy in [y,y+4]:d.line((11,yy,21,yy+1),fill=shade)
    d.rectangle((12,y-10,21,y-6),fill=shade);d.point((13,y-9),fill=shine);d.point((20,y-9),fill=shine)
    if role=='scorpion':
        d.line((16,y+7,25,y+3,27,y-7,23,y-13,18,y-12),fill=mid,width=3)
        for x,yy in [(24,y+2),(27,y-3),(25,y-9),(21,y-12)]:d.point((x,yy),fill=light)
        d.polygon([(18,y-14),(15,y-13),(19,y-9),(21,y-12)],fill=shine)
        for x in [5,24]:d.polygon([(x,y-9),(x+3,y-12),(x+5,y-8),(x+3,y-4),(x,y-6)],fill=light);d.line((x+2,y-10,x+2,y-7),fill=shade)
    else:
        d.polygon([(13,y-10),(12,y-15),(16,y-12),(20,y-15),(20,y-10)],fill=light)
        d.line((14,y-13,19,y-13),fill=shine)

def boss(im,world,frame):
    d=ImageDraw.Draw(im);dark,shade,mid,light,shine=PALETTES[world]
    bob=[0,-1,0,1,-2,0,2,4,-1,0][frame]; y=bob;attack=frame==4
    if world=='forest':
        # Ancient living oak: roots, asymmetric limbs, stone mask, leaf crown.
        for x in [12,21,31,42,49]:d.polygon([(x,44+y),(x-4,57+y),(x-9,61+y),(x+3,60+y),(x+6,47+y)],fill='#5a4d3d');d.line((x+2,46+y,x-2,58+y),fill='#a08c5e',width=2)
        d.polygon([(20,17+y),(43,18+y),(48,47+y),(34,56+y),(17,47+y)],fill='#4f634c');d.polygon([(23,19+y),(39,21+y),(40,46+y),(28,48+y),(23,40+y)],fill='#8b9674')
        for x,yy in [(10,23),(4,35),(46,27),(51,40)]:
            dy=-7 if attack else 0;d.polygon([(x,yy+y+dy),(x+9,yy-3+y+dy),(x+12,yy+13+y+dy),(x+4,yy+17+y+dy),(x-2,yy+8+y+dy)],fill='#5b7150');d.line((x+2,yy+y+dy,x+4,yy+9+y+dy),fill='#a3ab78',width=2)
        d.polygon([(23,9+y),(39,8+y),(44,15+y),(40,28+y),(23,28+y),(18,17+y)],fill='#756d54');d.polygon([(24,12+y),(38,11+y),(40,23+y),(25,25+y)],fill='#b3b58d')
        d.rectangle((25,17+y,29,19+y),fill='#e5d994');d.rectangle((35,17+y,39,19+y),fill='#e5d994');d.line((28,24+y,36,24+y),fill='#3f5144')
        for pts in [[(23,12),(17,6),(12,6),(8,1)],[(38,10),(45,3),(52,3),(55,0)],[(18,6),(20,1)],[(46,4),(46,0)]]:d.line([(x,yy+y) for x,yy in pts],fill='#a18b5e',width=3)
        for x,yy in [(13,12),(19,5),(43,9),(47,21),(9,34),(41,43),(22,42)]:d.polygon([(x-4,yy+y),(x,yy-4+y),(x+6,yy+y),(x+2,yy+4+y)],fill='#6d9251');d.line((x-2,yy+y,x+3,yy+y),fill='#a6b874')
        d.polygon([(31,29+y),(38,35+y),(31,42+y),(25,35+y)],fill='#344f43');d.polygon([(31,31+y),(35,35+y),(31,39+y),(28,35+y)],fill='#d1c282');d.point((31,34+y),fill='#fff1b4')
        for yy in [31,41,47]:d.line((20,yy+y,25,yy+3+y),fill='#4b614c')
    elif world=='desert':
        # Sandstone temple colossus with carved pharaonic face and floating fists.
        d.polygon([(21,48+y),(27,48+y),(27,60+y),(17,60+y),(17,55+y)],fill=shade);d.polygon([(38,48+y),(44,48+y),(48,60+y),(36,60+y)],fill=shade)
        d.polygon([(16,24+y),(47,24+y),(51,47+y),(43,54+y),(19,51+y),(13,38+y)],fill=mid)
        for yy in [28,36,44]:d.line((18,yy+y,46,yy+y),fill=shade,width=2);d.line((20,yy+2+y,43,yy+2+y),fill=light)
        d.polygon([(19,8+y),(27,3+y),(40,3+y),(46,9+y),(44,25+y),(19,25+y)],fill=light)
        for x in [18,43]:d.rectangle((x,9+y,x+4,27+y),fill=shade);d.line((x+1,11+y,x+1,24+y),fill=light)
        d.polygon([(24,9+y),(39,9+y),(41,19+y),(35,25+y),(26,22+y)],fill=mid);d.rectangle((25,13+y,29,15+y),fill=shine);d.rectangle((35,13+y,39,15+y),fill=shine)
        d.polygon([(31,15+y),(34,15+y),(35,21+y),(31,20+y)],fill=shade);d.line((28,23+y,36,23+y),fill=shade)
        d.rectangle((13,5+y,49,9+y),fill='#a48658');d.line((16,5+y,47,5+y),fill=shine)
        for x in [17,24,31,38,45]:d.line((x,3+y,x,7+y),fill=light)
        for x,yy in [(2,28),(50,29)]:
            yy+= y-5 if attack else y;d.polygon([(x+1,yy),(x+9,yy-2),(x+12,yy+4),(x+10,yy+15),(x,yy+14)],fill=mid);d.line((x+2,yy+1,x+8,yy),fill=light);d.rectangle((x+3,yy+7,x+7,yy+10),fill=shade)
        for x,yy in [(24,29),(38,37),(25,45)]:d.line((x,yy+y,x+5,yy+y,x+2,yy+4+y),fill=shine)
        d.polygon([(31,31+y),(37,37+y),(31,43+y),(26,37+y)],fill='#566f67');d.line((31,33+y,32,40+y),fill='#e7d2a1')
    elif world=='frozen':
        # Crowned glacial warden with ice pauldrons, cloak and a long crystal sword.
        d.polygon([(19,19+y),(45,19+y),(54,57+y),(12,57+y)],fill=shade);d.polygon([(25,23+y),(39,23+y),(45,57+y),(24,57+y)],fill='#42667e')
        for x in [17,42]:d.polygon([(x,23+y),(x+7,18+y),(x+12,33+y),(x+6,38+y)],fill=light);d.line((x+5,22+y,x+7,32+y),fill=shine)
        d.polygon([(24,21+y),(40,21+y),(43,43+y),(33,51+y),(21,42+y)],fill=mid);d.polygon([(27,24+y),(37,24+y),(38,40+y),(31,44+y),(25,39+y)],fill=light)
        d.polygon([(22,13+y),(25,7+y),(38,7+y),(43,14+y),(40,25+y),(24,25+y)],fill=mid);d.rectangle((26,15+y,39,20+y),fill=dark);d.line((28,17+y,31,17+y),fill=shine);d.line((36,17+y,38,17+y),fill=shine)
        for x,h in [(22,5),(28,1),(35,3),(42,6)]:d.polygon([(x-2,12+y),(x,h+y),(x+3,12+y)],fill=light)
        d.line((12,8+y,9,49+y),fill='#637f97',width=3);d.polygon([(12,1+y),(16,12+y),(12,43+y),(8,44+y)],fill='#b6f1ed');d.line((12,4+y,11,34+y),fill=shine)
        d.line((5,45+y,17,45+y),fill='#c2c8a3',width=3)
        for x,yy in [(46,13),(51,36),(18,48)]:d.polygon([(x,yy+y),(x+4,yy-6+y),(x+7,yy+4+y)],fill=light)
        d.polygon([(31,29+y),(36,34+y),(31,39+y),(27,34+y)],fill='#3f90b2');d.point((31,33+y),fill=shine)
    else:
        # Horned sovereign: broad leathery wings, plated torso and ember heart.
        wingup=3 if attack else frame%3
        for pts in [[(24,18),(10,8-wingup),(4,12),(2,39),(11,33),(19,37)],[(39,18),(52,8-wingup),(59,12),(62,39),(53,33),(45,37)]]:
            d.polygon([(x,yy+y) for x,yy in pts],fill='#633b43');d.line([(x,yy+y) for x,yy in pts[:4]],fill='#b76f52',width=2)
        d.polygon([(23,18+y),(40,18+y),(46,44+y),(39,55+y),(22,52+y),(18,38+y)],fill='#4e3744')
        d.polygon([(26,24+y),(38,24+y),(41,42+y),(31,48+y),(23,41+y)],fill='#95634f');d.line((25,29+y,31,33+y,38,29+y),fill='#e7a565',width=2)
        for x in [21,37]:d.polygon([(x,46+y),(x+7,46+y),(x+8,58+y),(x+11,60+y),(x-1,60+y)],fill='#70494a');d.line((x+2,49+y,x+3,57+y),fill='#bf8b66',width=2)
        d.polygon([(24,7+y),(39,7+y),(43,18+y),(38,26+y),(26,25+y),(21,16+y)],fill='#8c584c')
        d.polygon([(25,11+y),(16,4+y),(18,0+y),(30,8+y)],fill='#d2a573');d.polygon([(37,10+y),(45,3+y),(47,0+y),(47,11+y),(41,15+y)],fill='#e6c28a')
        d.rectangle((26,16+y,30,18+y),fill=shine);d.rectangle((36,16+y,40,18+y),fill=shine);d.polygon([(30,20+y),(36,20+y),(34,24+y)],fill=dark)
        d.polygon([(31,31+y),(37,39+y),(31,46+y),(26,39+y)],fill='#ffb76a');d.polygon([(31,34+y),(33,39+y),(31,42+y),(29,39+y)],fill='#fff2b5')
        for x,yy in [(13,43),(48,42)]:d.polygon([(x,yy+y),(x+3,yy-10+y),(x+8,yy-3+y),(x+6,yy+8+y)],fill='#b3664c');d.line((x+2,yy+y,x+5,yy-4+y),fill='#ffcf84',width=2)


def actor(world,kind,frame):
    n=64 if kind=='boss' else 32
    if frame in (6,7):
        source=actor(world,kind,0);im=Image.new('RGBA',(n,n));a=1 if frame==6 else 2
        # Actual collapse/fragments, retaining recognizable species pixels.
        if kind=='boss':
            for j in range(4):
                part=source.crop((j*n//4,0,(j+1)*n//4,n));part=part.resize((n//4,max(6,n//(2+a))),Image.Resampling.NEAREST)
                im.alpha_composite(part,(j*n//4,n-part.height-(j%2)*2))
        else:
            part=source.resize((n-2,n//(2+a)),Image.Resampling.NEAREST);im.alpha_composite(part,(1,n-part.height-1))
        d=ImageDraw.Draw(im)
        for j in range(5 if n==32 else 12):
            x=(j*11+5)%n;y=n-2-((j*7)%max(3,n//5));d.point((x,y),fill=PALETTES[world][3])
        return im
    im=Image.new('RGBA',(n,n));y=15+[0,-1,0,1,-2,0,0,0,-1,1][frame]
    if kind=='boss':boss(im,world,frame)
    elif world=='forest' and kind=='slime' or world=='frozen' and kind=='slime':
        d=ImageDraw.Draw(im);dark,shade,mid,light,shine=PALETTES[world];yy=y+(1 if frame==4 else 0)
        d.ellipse((4,yy-6,28,yy+12),fill=shade);d.polygon([(6,yy+3),(8,yy-5),(15,yy-9),(24,yy-4),(28,yy+7),(22,yy+11),(8,yy+10)],fill=mid)
        d.arc((8,yy-6,24,yy+10),190,295,fill=light,width=2);d.rectangle((10,yy+1,12,yy+3),fill=dark);d.rectangle((21,yy+1,23,yy+3),fill=dark);d.line((15,yy+6,19,yy+6),fill=shade)
        d.point((11,yy+1),fill=shine);d.point((22,yy+1),fill=shine)
        if world=='forest':
            for x,yy2 in [(10,yy-4),(19,yy-7)]:d.polygon([(x-2,yy2),(x,yy2-4),(x+4,yy2-2),(x+1,yy2+1)],fill='#a4b674')
        else:
            for x,h in [(8,4),(16,8),(24,3)]:d.polygon([(x-2,yy-3),(x,yy-h-6),(x+3,yy-2)],fill='#b6efec')
    elif world=='desert' and kind in ('slime','wolf'):insect(im,world,'scorpion' if kind=='wolf' else 'scarab',frame,y)
    elif world=='infernal' and kind=='slime':
        humanoid(im,world,'goblin',frame,y);d=ImageDraw.Draw(im)
        d.polygon([(8,y-9),(6,y-15),(13,y-10)],fill='#dfb780');d.polygon([(20,y-11),(26,y-15),(24,y-8)],fill='#eac78b');d.line((8,y+9,3,y+8,2,y+4),fill='#d98b56',width=2)
        # Imp body has exposed ember skin rather than a forest goblin vest.
        d.rectangle((12,y,22,y+5),fill='#b97651');d.point((16,y+2),fill='#ffdd88')
    elif (world=='forest' and kind=='wolf') or (world=='frozen' and kind=='goblin') or (world=='infernal' and kind=='goblin'):quadruped(im,world,frame,y,world=='infernal')
    else:
        role={('forest','goblin'):'goblin',('forest','caster'):'mage',('forest','elite'):'guardian',('desert','goblin'):'bandit',('desert','caster'):'archer',('desert','elite'):'golem',('frozen','wolf'):'knight',('frozen','caster'):'mage',('frozen','elite'):'elemental',('infernal','wolf'):'knight',('infernal','caster'):'archer',('infernal','elite'):'golem'}[(world,kind)]
        if role=='elemental':
            d=ImageDraw.Draw(im)
            for x,yy,w,h in [(16,13,8,13),(5,17,4,7),(26,17,4,7),(14,29,3,3)]:
                d.polygon([(x,yy-h),(x+w,yy),(x,yy+h),(x-w,yy)],fill='#578ba5');d.polygon([(x,yy-h+2),(x+3,yy),(x,yy+h-2),(x-1,yy)],fill='#b0e8e6');d.line((x,yy-h+3,x,yy+2),fill='#effff5')
            d.rectangle((13,9,19,11),fill='#1a4e6a');d.point((14,10),fill='#f5fff7');d.point((18,10),fill='#f5fff7')
        else:humanoid(im,world,role,frame,y)
    im=outlined(im)
    if frame==5:
        flash=Image.new('RGBA',im.size,'#fff1ce');flash.putalpha(im.getchannel('A'));im=Image.blend(im,flash,.62)
    return im


def prop(world,kind):
    n=(32,24) if world=='forest' and kind=='rock' else (64,80)
    im=Image.new('RGBA',n);d=ImageDraw.Draw(im);rng=random.Random(311+WORLDS.index(world)*7+(kind=='rock'))
    if world=='forest' and kind=='rock':
        d.ellipse((3,17,29,23),fill='#10252577');d.polygon([(4,17),(7,8),(18,3),(27,9),(27,18),(18,21),(7,20)],fill='#4c5e5a');d.polygon([(8,8),(18,4),(25,10),(18,13),(6,15)],fill='#829083');d.line((10,8,17,6,22,9),fill='#b2b79a');d.line((18,14,22,18),fill='#374d49')
        for x,y in [(5,16),(8,18),(20,19)]:d.rectangle((x,y,x+3,y+1),fill='#6d8a53')
        return im
    d.ellipse((19,67,45,77),fill='#101e2b66')
    if world=='forest':
        d.polygon([(27,45),(37,45),(36,69),(42,73),(35,74),(30,69),(22,73),(26,65)],fill='#584b36');d.line((31,47,31,67,35,72),fill='#a68b5b',width=2)
        for x,y,w,h in [(31,12,17,18),(28,25,22,17),(35,39,25,18),(28,51,27,17),(34,59,24,13)]:
            d.polygon([(x,y-h),(x-w,y+h//2),(x-w+4,y+h//2+4),(x+w,y+h//2+2)],fill='#233e32');d.polygon([(x,y-h+3),(x-w+4,y+h//2-1),(x+w-4,y+h//2)],fill='#3e613d')
            for j in range(20):
                xx=x+rng.randrange(-w+4,w-3);yy=y+rng.randrange(-h//2,h//2+1)
                if im.getpixel((max(0,min(63,xx)),max(0,min(79,yy))))[3]:d.line((xx,yy,xx+2,yy),fill=rng.choice(['#63804a','#486e40','#789456','#304e36']))
        d.line((29,11,27,18),fill='#a0ab6e')
    elif world=='desert' and kind=='tree':
        d.rectangle((23,22,41,68),fill='#80664c');d.rectangle((26,22,38,67),fill='#c39d69')
        for x in [27,31,35]:d.line((x,24,x,63),fill='#e0bc82')
        for yy in [24,38,52,64]:d.line((23,yy,41,yy),fill='#a78359')
        d.polygon([(20,19),(21,12),(43,12),(45,20),(41,24),(23,24)],fill='#ae875d');d.rectangle((18,12,46,17),fill='#d8b981');d.line((20,12,43,12),fill='#f1d39b')
        d.rectangle((19,66,45,71),fill='#c8a26d');d.line((20,67,44,67),fill='#ead09b')
        d.polygon([(31,29),(34,32),(31,36),(29,32)],fill='#527e72');d.line((30,42,34,44,30,48),fill='#6a856c')
    elif world=='desert':
        # Low fractured sandstone; wholly different from the pillar silhouette.
        d.polygon([(20,69),(20,54),(29,43),(43,46),(48,58),(42,70),(28,74)],fill='#987349');d.polygon([(22,54),(29,44),(40,47),(35,55)],fill='#d5b27a');d.polygon([(36,56),(46,56),(42,68),(29,72)],fill='#b98f5c');d.line((29,54,29,63,24,68),fill='#765d43');d.line((36,58,40,60),fill='#e6c58a')
        d.polygon([(16,70),(21,64),(27,68),(26,73),(18,75)],fill='#b49467');d.line((19,69,22,68),fill='#e1bf84')
    elif world=='frozen' and kind=='tree':
        for x,yy,h,w in [(21,69,39,9),(32,72,65,11),(43,69,43,9)]:
            d.polygon([(x-w,yy),(x-w+2,yy-h+13),(x,yy-h),(x+w,yy-h+14),(x+w-2,yy)],fill='#426d8c');d.polygon([(x,yy-h+3),(x+w-2,yy-h+15),(x+3,yy-3),(x,yy)],fill='#88d5dd');d.line((x,yy-h+5,x-3,yy-7),fill='#d7f9ed',width=2)
        d.line((27,49,35,46,37,58),fill='#a6e9e9')
    elif world=='frozen':
        d.polygon([(17,68),(22,52),(35,47),(46,56),(47,69),(35,74),(22,73)],fill='#466a86');d.polygon([(22,53),(34,48),(43,56),(31,61),(19,64)],fill='#a8d2d9');d.polygon([(28,61),(43,59),(44,68),(34,72)],fill='#75a5ba');d.line((25,55,32,57,34,63),fill='#e2f7ef');d.line((20,69,27,70),fill='#d7efec')
        for x,y in [(20,62),(34,53),(40,65)]:d.line((x,y,x+3,y-2),fill='#cff6ed')
    elif kind=='tree':
        d.polygon([(22,68),(18,49),(26,25),(30,9),(39,18),(44,44),(45,70),(34,74)],fill='#292835');d.polygon([(25,64),(24,47),(30,29),(33,16),(35,45),(39,67)],fill='#55414a');d.line((32,28,29,43,35,51,30,67),fill='#d97848',width=3);d.line((32,33,32,42,37,48),fill='#ffc276')
        d.polygon([(21,65),(14,57),(17,45),(23,47)],fill='#38323d')
    else:
        d.polygon([(18,69),(21,56),(33,49),(44,55),(49,65),(42,73),(28,74)],fill='#2a2835');d.polygon([(23,57),(33,50),(43,56),(34,62)],fill='#5a4650');d.line((29,54,31,63,26,70),fill='#b96543',width=2);d.line((33,61,41,67),fill='#ffb55f');d.line((20,68,25,70),fill='#77504b')
    return im


def terrain(world):
    rng=random.Random(854+WORLDS.index(world));im=Image.new('RGB',(96,32));d=ImageDraw.Draw(im)
    backgrounds={'forest':['#2a4132','#726b51','#384e36'],'desert':['#b2915f','#c8ad7d','#9c7a50'],'frozen':['#40576b','#75929f','#5fabbc'],'infernal':['#302b34','#5c4641','#e77b3c']}[world]
    for tile,base in enumerate(backgrounds):
        ox=tile*32;d.rectangle((ox,0,ox+31,31),fill=base)
        if world=='forest':
            for i in range(70):
                x=ox+rng.randrange(31);y=rng.randrange(31);d.line((x,y,x+1,y),fill=rng.choice(['#314b36','#3d553c','#506144'] if tile!=1 else ['#7e785b','#888163','#625d49']))
            if tile==1:
                for x,y in [(3,6),(20,4),(12,21),(25,27)]:pebble(d,ox+x,y,['#625e49','#8a8463','#aaa080'])
            elif tile==2:
                for x,y in [(3,5),(22,21)]:d.line((ox+x,y+3,ox+x+1,y-1),fill='#78925a');d.rectangle((ox+x-1,y-1,ox+x+2,y),fill='#bb8f61')
        elif world=='desert':
            for y in range(3,32,6):
                start=rng.randrange(8);d.line((ox+start,y,ox+min(31,start+15),y),fill='#c8a873' if tile!=1 else '#dfc18c')
            if tile==1:
                for y in [0,15,31]:d.line((ox,y,ox+31,y),fill='#9f845e')
                for x,y in [(10,0),(25,15)]:d.line((ox+x,y,ox+x,y+14),fill='#9f845e');d.line((ox+x+1,y+1,ox+min(31,x+13),y+1),fill='#e6cb99')
            elif tile==2:
                d.arc((ox+7,7,ox+23,25),0,300,fill='#b79562');d.line((ox+15,7,ox+19,13,ox+13,16),fill='#d9b57c')
        elif world=='frozen':
            for i in range(50):x=ox+rng.randrange(32);y=rng.randrange(32);d.point((x,y),fill=rng.choice(['#506c7c','#64818e','#355063'] if tile!=2 else ['#70b9c7','#8acbd2','#99d4d7']))
            if tile==1:
                for x,y in [(0,0),(17,15)]:d.line((ox+x,y,ox+x+13,min(31,y+5)),fill='#b6cdd0');d.line((ox+x+13,min(31,y+5),ox+x+11,min(31,y+17)),fill='#4b6b80')
            elif tile==2:
                d.line((ox+4,0,ox+14,10,ox+12,24,ox+21,31),fill='#c6f4ec',width=1);d.line((ox+14,10,ox+25,7,ox+31,11),fill='#91dde1')
        else:
            for i in range(50):x=ox+rng.randrange(32);y=rng.randrange(32);d.point((x,y),fill=rng.choice(['#493a40','#3b303a','#574047'] if tile!=2 else ['#f3a351','#b95736','#ffd17e']))
            if tile==1:
                for x,y in [(4,4),(21,18)]:d.line((ox+x,y,ox+x+7,y+3,ox+x+5,min(31,y+13)),fill='#332c36');d.line((ox+x,y+1,ox+x+5,y+4),fill='#786055')
            elif tile==2:
                d.line((ox,7,ox+8,12,ox+16,7,ox+25,13,ox+31,9),fill='#ffe2a0',width=2);d.line((ox+3,26,ox+12,20,ox+21,25,ox+31,20),fill='#ffc36c',width=3)
    return im


def worldset(root=Path('public/assets/worlds')):
    root.mkdir(parents=True,exist_ok=True)
    for wi,world in enumerate(WORLDS):
        out=root/world;out.mkdir(exist_ok=True);tiles=terrain(world);tiles.save(out/'tiles.png')
        for kind in ('tree','rock'):prop(world,kind).save(out/(kind+'.png'))
        for kind in KINDS:
            n=64 if kind=='boss' else 32;sheet=Image.new('RGBA',(n*10,n))
            for frame in range(10):sheet.alpha_composite(actor(world,kind,frame),(n*frame,0))
            sheet.save(out/(kind+'.png'))
        rng=random.Random(881+wi);art=Image.new('RGB',(480,270))
        for yy in range(0,270,32):
            for xx in range(0,480,32):
                tile=1 if abs(xx-240)<45 else (2 if rng.random()<.06 else 0);art.paste(tiles.crop((tile*32,0,tile*32+32,32)),(xx,yy))
        tree=prop(world,'tree');rock=prop(world,'rock')
        for i in range(34):
            x=rng.randrange(480);y=rng.randrange(270)
            if 190<x<290:continue
            pic=tree if i%4 else rock;art.paste(pic,(x-pic.width//2,y-int(pic.height*.87)),pic)
        creature=actor(world,'boss',0).resize((128,128),Image.Resampling.NEAREST);art.paste(creature,(176,90),creature)
        art.resize((960,540),Image.Resampling.NEAREST).save(out/'preview.png')
    (root/'LICENSE.md').write_text('SPDX-License-Identifier: CC0-1.0\nOriginal NowRift pixel artwork authored in scripts/world-art.py. No reference pixels are copied. https://creativecommons.org/publicdomain/zero/1.0/\n')

def legacy():
    """The original practice stage shares the forest species, not duplicated art code."""
    out=Path('public/assets/forest')
    for kind in KINDS:
        n=64 if kind=='boss' else 32;sheet=Image.new('RGBA',(n*10,n))
        for frame in range(10):sheet.alpha_composite(actor('forest',kind,frame),(n*frame,0))
        sheet.save(out/(kind+'.png'))
    for kind in ('tree','rock'):prop('forest',kind).save(out/(kind+'.png'))
    ground=Image.new('RGB',(256,256));tile=terrain('forest')
    for y in range(0,256,32):
        for x in range(0,256,32):ground.paste(tile.crop((0,0,32,32)),(x,y))
    ground.save(out/'ground.png')

if __name__=='__main__':
    worldset();legacy();print('Generated authored biome tiles, distinct props and 24 animated species/boss sheets, plus practice forest art.')
