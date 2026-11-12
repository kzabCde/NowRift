"""Original CC0 finishing art for existing town, actual items and functional stations.
Runs after the original kit generators; no downloaded/reference-sheet pixels are used.
"""
from PIL import Image, ImageDraw
from pathlib import Path
import importlib.util, math, random

def module(name,file):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
layers=module('modular_art','character-layers.py')
base=module('weapon_art','character-art.py')
OUT=Path('public/assets')
# Actual inventory art shares material/silhouette definitions with worn equipment.
atlas=Image.open(OUT/'items/atlas.png').convert('RGBA')
for world_index,world in enumerate(layers.MATERIALS):
    dark,mid,light,gem=layers.MATERIALS[world]
    for slot in range(6):
        im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im)
        if slot==0:im=base.weapon(world_index)
        elif slot in (1,2):
            part=layers.draw_layer('wanderer',('armor-' if slot==1 else 'head-')+world+'-1','down',0)
            crop=part.crop(part.getbbox());im.alpha_composite(crop,((32-crop.width)//2,(32-crop.height)//2))
        elif slot==3:
            for x in [5,18]:
                d.polygon([(x,4),(x+8,4),(x+7,20),(x+10,23),(x+10,28),(x-1,28),(x-1,24)],fill=dark)
                d.rectangle((x+1,6,x+6,20),fill=mid);d.line((x,26,x+9,26),fill=light,width=2)
                if world=='forest':
                    for y in range(9,20,3):d.line((x+2,y,x+5,y+2),fill=light)
                elif world=='desert':
                    for y in range(7,23,4):d.line((x,y,x+6,y+2),fill=gem,width=2)
                elif world=='frozen':d.polygon([(x,6),(x+4,1),(x+8,6),(x+6,18)],fill=light);d.line((x+2,9,x+4,17),fill=gem)
                else:d.polygon([(x,5),(x-3,1),(x+3,4),(x+6,1),(x+8,8)],fill=light);d.line((x+2,10,x+4,15,x+2,20),fill=gem,width=2)
        elif slot==4:
            d.ellipse((5,8,27,29),fill=dark);d.ellipse((7,9,25,27),fill=light);d.ellipse((11,13,21,23),fill=(0,0,0,0))
            if world=='forest':d.ellipse((9,3,23,15),fill=dark);d.ellipse((11,4,21,13),fill=gem);d.line((13,5,15,7),fill=light)
            elif world=='desert':
                for i in range(8):
                    a=i*math.pi/4;d.line((16+math.cos(a)*5,8+math.sin(a)*5,16+math.cos(a)*9,8+math.sin(a)*9),fill=gem,width=2)
                d.ellipse((12,4,20,12),fill=light)
            elif world=='frozen':d.polygon([(16,1),(23,8),(18,17),(10,10)],fill=mid);d.polygon([(16,3),(20,8),(17,13),(13,9)],fill=gem);d.line((16,4,16,10),fill='#efffff')
            else:d.polygon([(9,6),(12,0),(16,6),(22,1),(24,12),(16,17),(9,13)],fill=mid);d.polygon([(16,6),(20,10),(16,14),(12,10)],fill=gem)
        else:
            d.arc((5,1,27,24),0,180,fill=light,width=2)
            if world=='forest':d.polygon([(16,14),(24,17),(21,26),(11,30),(10,21)],fill=dark);d.line((13,26,20,18),fill=gem,width=3);d.line((15,24,14,20),fill=light)
            elif world=='desert':
                d.ellipse((7,13,25,31),fill=dark);d.ellipse((9,15,23,29),fill=light);d.ellipse((11,17,21,27),fill=mid);d.line((16,18,16,23,21,25),fill=dark,width=2)
            elif world=='frozen':d.polygon([(16,12),(24,23),(20,29),(13,31),(8,24)],fill=mid);d.polygon([(16,15),(20,23),(16,28),(12,24)],fill=gem);d.line((16,17,14,23),fill=light,width=2)
            else:d.polygon([(8,17),(11,12),(16,18),(21,12),(25,17),(23,25),(16,31),(9,26)],fill=dark);d.polygon([(11,18),(16,21),(21,17),(20,24),(16,28),(12,24)],fill=gem)
        atlas.paste(im,((world_index*6+slot)%8*32,(world_index*6+slot)//8*32))
# Each resource corresponds to the real registry order, with a unique silhouette.
for n in range(16):
    im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im);rng=random.Random(880+n)
    if n==0: # Wood: cut end grain, bark and a broken twig.
        d.polygon([(4,15),(22,6),(29,13),(13,27),(5,26)],fill='#3d352e');d.polygon([(6,15),(22,8),(26,12),(12,23)],fill='#906844')
        d.ellipse((4,15,16,28),fill='#c8a46b',outline='#513f31',width=2);d.ellipse((7,18,13,25),outline='#947148');d.line((13,17,23,11),fill='#d2ae7c');d.line((20,11,21,4),fill='#8e704e',width=3)
    elif n==1: # Slime core.
        d.ellipse((5,6,27,28),fill='#294e4a');d.ellipse((7,7,24,25),fill='#6a9b77');d.ellipse((11,9,20,17),fill='#cbe5ad');d.ellipse((14,12,18,16),fill='#f0f2cc');d.line((9,23,15,25),fill='#a5c89a')
    elif n in (2,4,10): # Copper/gold/obsidian rocks with mineral clusters.
        colors={2:('#745148','#bd8a68','#edbb89'),4:('#6c6043','#c2a34f','#f9d877'),10:('#272e3c','#55576c','#9995ae')}[n];dark,mid,light=colors
        d.polygon([(3,25),(6,13),(14,8),(25,11),(29,24),(21,29),(9,29)],fill=dark)
        for x,y in [(7,17),(13,12),(21,16),(13,23)]:d.polygon([(x,y),(x+4,y-3),(x+7,y),(x+5,y+5),(x,y+4)],fill=mid);d.line((x+1,y,x+4,y-2),fill=light,width=2)
    elif n==3: # Ancient tablet fragment.
        d.polygon([(5,8),(19,3),(27,9),(25,24),(12,29),(6,21)],fill='#6c5d50');d.polygon([(8,9),(18,5),(23,11),(22,23),(12,26),(8,20)],fill='#c3aa79');d.line((11,11,17,8,18,15,13,16,14,22),fill='#706f64',width=2);d.line((20,13,18,23),fill='#eee0ab')
    elif n==5: # Desert relic scarab.
        d.ellipse((6,8,26,29),fill='#8b6b3f');d.ellipse((10,11,22,25),fill='#d5b467');d.line((16,12,16,26),fill='#5a644f',width=2)
        for y in (14,19,24):d.line((6,y,3,y+3),fill='#d5b467',width=2);d.line((25,y,29,y+3),fill='#d5b467',width=2)
        d.polygon([(11,9),(13,3),(19,3),(22,9)],fill='#a6c9be');d.point((15,5),fill='#f4eac5')
    elif n==6: # Frost crystals.
        for x,y,h in [(6,14,14),(13,3,23),(22,10,17)]:d.polygon([(x,y+h),(x-3,y+5),(x+1,y),(x+5,y+5),(x+5,y+h)],fill='#4b819d');d.polygon([(x+1,y+2),(x+3,y+6),(x+1,y+h-2)],fill='#b3e8e8');d.line((x-1,y+8,x,y+h-2),fill='#70c9dc')
    elif n==7: # Frozen essence in an intact ampoule.
        d.rectangle((12,3,20,6),fill='#d4ccad');d.polygon([(12,7),(20,7),(21,16),(26,22),(23,29),(9,29),(6,22),(11,16)],fill='#37586d');d.polygon([(12,16),(20,16),(23,23),(21,26),(11,26),(9,22)],fill='#89cfd7');d.line((10,20,11,24),fill='#ecffff',width=2);d.rectangle((13,8,15,13),fill='#b1d5cf')
    elif n==8: # Enhancement stone rune.
        d.polygon([(5,9),(14,3),(24,7),(28,21),(20,29),(7,27),(3,18)],fill='#4b465c');d.polygon([(8,10),(15,6),(22,10),(24,20),(18,25),(8,23),(6,17)],fill='#9c86ba');d.line((11,17,16,11,21,17,16,22,16,12),fill='#e9d6e8',width=2)
    elif n==9: # Infernal core, lobed magma shell.
        d.polygon([(9,3),(18,5),(25,10),(29,21),(22,29),(9,28),(3,20),(5,10)],fill='#563941');d.polygon([(10,8),(18,7),(24,15),(23,24),(13,25),(7,18)],fill='#bd653f');d.polygon([(15,9),(20,15),(18,22),(11,20),(12,14)],fill='#ffc278');d.point((16,15),fill='#fff2be')
    elif n==11: # Epic materials = rolled enchanted cloth, rivets and plate.
        d.polygon([(5,24),(8,9),(21,4),(28,10),(24,26),(11,29)],fill='#49394e');d.polygon([(10,11),(21,7),(25,12),(21,23),(12,26)],fill='#886284');d.line((13,13,20,10,22,14,17,21),fill='#c0a1b6',width=2)
        for x,y in [(8,11),(11,24),(24,12)]:d.rectangle((x,y,x+2,y+2),fill='#e3c78b')
    else: # Four corresponding unique guardian relics.
        family=n-12
        if family==0:
            for x,y in [(6,14),(14,7),(21,12)]:d.polygon([(x,y),(x+5,y-5),(x+8,y+3),(x+1,y+10)],fill='#78975d');d.line((x+2,y+6,x+5,y-1),fill='#d1dca2')
            d.rectangle((12,23,20,29),fill='#b4a078')
        elif family==1:
            d.ellipse((5,5,27,28),fill='#80613e');d.ellipse((8,7,24,25),fill='#e2bb69');d.polygon([(16,9),(22,15),(16,23),(10,15)],fill='#b47247');d.line((16,11,16,20),fill='#ffe3a0')
        elif family==2:
            d.polygon([(15,3),(25,14),(24,23),(17,29),(8,26),(5,18)],fill='#467f9b');d.polygon([(15,6),(21,15),(19,24),(12,24),(9,18)],fill='#98dee0');d.line((14,9,11,18),fill='#eaffef',width=2)
        else:
            d.polygon([(4,9),(10,14),(16,3),(22,14),(29,8),(25,27),(8,27)],fill='#654150');d.polygon([(9,16),(14,18),(17,11),(21,18),(25,15),(23,23),(10,23)],fill='#e5b771');d.rectangle((14,21,19,25),fill='#ec9965')
    atlas.paste(im,((24+n)%8*32,(24+n)//8*32))
atlas.save(OUT/'items/atlas.png')
# Masonry, roof trim and named building details all stay inside existing source bounds.
for name in ['forge','workshop','wardrobe','market','inn','store']:
    p=OUT/'haven'/f'{name}.png';im=Image.open(p).convert('RGBA');d=ImageDraw.Draw(im);rng=random.Random(220+len(name))
    for y in range(73,137,10):
        for x in range(23,127,15):
            if 55<x<94 or 104<y<127:continue
            xx=x+(5 if (y//10)%2 else 0);d.line((xx,y,xx+9,y),fill='#d0bca0');d.line((xx+10,y+1,xx+10,y+7),fill='#8f806e')
    for x in range(14,141,8):d.line((x,76,x+2,79),fill='#7b8a5a');d.point((x+1,77),fill='#bac18d')
    if name=='workshop':
        d.rectangle((103,28,120,43),fill='#3b4b4c',outline='#bdc7af');d.line((111,29,111,42),fill='#829e9c');d.line((105,33,118,33),fill='#d1d7bc')
        for x in range(21,48,5):d.line((x,136,x+8,131),fill='#d0ad77',width=2)
    elif name=='wardrobe':
        d.polygon([(76,20),(88,29),(76,38),(65,29)],fill='#798687',outline='#c8cbb5');d.ellipse((71,24,80,33),fill='#e0d7b3');d.ellipse((75,22,83,29),fill='#798687')
        for y in (100,127):d.line((17,y,40,y),fill='#cab28b')
    elif name=='forge':
        for x in range(22,41,5):d.line((x,129,x,140),fill='#473d38',width=2)
        d.polygon([(103,136),(110,129),(125,129),(129,133),(121,135),(121,140),(112,140),(110,136)],fill='#7b9191');d.line((111,130,124,130),fill='#c0c9ad')
    elif name=='market':
        for x in (21,36,111):d.ellipse((x,133,x+12,145),fill='#674d3c',outline='#c2a77e');d.line((x+3,138,x+10,138),fill='#a1875f')
    elif name=='inn':
        d.rectangle((105,82,116,91),fill='#57433b');d.line((108,84,113,88),fill='#e2c194',width=2);d.line((113,88,113,90),fill='#e2c194')
    else:
        d.rectangle((67,108,84,139),fill='#555b50')
        for y in range(112,138,5):d.line((68,y,83,y),fill='#818a75')
        d.ellipse((72,121,80,131),fill='#e2c186',outline='#746249');d.rectangle((75,125,77,130),fill='#4b5149')
    im.save(p)
# Mara has a distinct apron, braid and brooch; no inherited player weapon.
npc=Image.new('RGBA',(480,48));poses=[0,1,2,3,10,18,19,20,21,22]
for index,pose in enumerate(poses):
    im=Image.new('RGBA',(48,48))
    for part in ['back-ember','body','skin-umber','pants-forest','inner-ember','boots-forest-0','face-calm','hair-braid']:
        im.alpha_composite(layers.draw_layer('wanderer',part,'down',pose))
    if pose not in (19,20,21):
        d=ImageDraw.Draw(im);bob=layers.frame_geometry('wanderer',pose)[1]
        d.polygon([(18,23+bob),(30,23+bob),(33,36+bob),(16,36+bob)],fill='#a5ad91');d.line((20,25+bob,19,33+bob),fill='#e2dabb');d.rectangle((21,29+bob,28,33+bob),fill='#7c8b77');d.point((23,22+bob),fill='#e9c77f')
    npc.alpha_composite(im,(index*48,0))
npc.save(OUT/'haven/npc.png')
# Compact station overlays: furnace fire, portal runes and fountain water.
folder=OUT/'pixel/interactions';folder.mkdir(parents=True,exist_ok=True)
for kind in ['fire','portal','water']:
    sheet=Image.new('RGBA',(256,32))
    for f in range(8):
        im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im)
        if kind=='fire':
            for i in range(5):
                x=7+i*4;y=6+((f+i*2)%4)*2
                d.polygon([(x-3,28),(x-4,19),(x,y),(x+3,17),(x+5,27)],fill='#aa5139');d.polygon([(x-2,27),(x,14+(f+i)%3),(x+2,23),(x+3,28)],fill='#efac5e');d.line((x,24,x,27),fill='#fff0b4',width=2)
        elif kind=='portal':
            for i in range(8):
                a=i*math.pi/4+f*math.pi/32;x=round(16+math.cos(a)*12);y=round(16+math.sin(a)*12)
                d.rectangle((x-1,y-1,x+1,y+1),fill='#b5dfc7');d.point((x,y-2),fill='#f1f4c5')
            d.arc((6+f%3,3,26-f%3,29),f*20,f*20+230,fill='#7cbfb8',width=2)
            d.line((15,9,12+f%3,16,19,20,16,25),fill='#d5edcc')
        else:
            for i in range(3):
                r=5+((f+i*3)%8);d.arc((16-r,17-r//3,16+r,17+r//3),10+f*8,160+f*8,fill='#abd1bd',width=1)
            d.line((15,1,16,13,14+f%3,17),fill='#c0ded1');d.point((13+f%4,19),fill='#eef2d0')
        sheet.alpha_composite(im,(f*32,0))
    sheet.save(folder/(kind+'.png'))
(folder/'LICENSE.md').write_text('SPDX-License-Identifier: CC0-1.0\nOriginal NowRift station animation and finishing art, authored in scripts/enrich-environment.py. https://creativecommons.org/publicdomain/zero/1.0/\n')
print('Refined all actual equipment/resource icons, town masonry/stations, distinct Mara, and three station animation atlases.')
