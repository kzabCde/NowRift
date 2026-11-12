"""Original CC0 48px modular anatomy, clothing and equipment. No reference pixels.
All layers use the same 26-frame, four-direction clock and foot pivot (24,36).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
SIZE=48
CHARACTERS=('wanderer','sentinel','strider')
DIRECTIONS=('down','right','up','left')
PALETTES={'moss':('#385743','#658663','#bdc29b'),'ember':('#69383c','#a85c48','#e1ba7b'),'tide':('#334e69','#5c8b9d','#b8d9d3')}
MATERIALS={'forest':('#513e32','#95765a','#d7bc8b','#7b9b67'),'desert':('#664934','#bb9155','#ead594','#c56d45'),'frozen':('#314d65','#7298aa','#d6eef0','#73d1df'),'infernal':('#322e40','#6e5364','#b5a5ae','#f0a45e')}
SKIN={'warm':('#765546','#ba9673','#e2c49c'),'umber':('#3e3030','#815947','#bc8965'),'pale':('#766568','#baa8a0','#e9d5c0')}

def frame_geometry(character,frame):
    width={'wanderer':8,'sentinel':10,'strider':7}[character]
    bob=[0,-1,0,0,0,-1,0,1,0,-1,-1,-2,0,1,-1,-2,-2,-1,1,0,0,0,1,2,3,1][frame]
    lean=0 if frame<10 else [-1,0,2,1][(frame-10)%4] if frame<14 else -2 if frame==18 else 0
    stride=[0,0,0,0,-2,-3,0,2,3,0][frame] if frame<10 else 0
    arm=-5 if 10<=frame<=11 else -7 if 14<=frame<=17 else [-6,-3,4,1][frame-22] if frame>=22 else round(-stride/2)
    return width,bob,lean,stride,arm

def draw_layer(character,name,direction,frame):
    if direction=='left':return ImageOps.mirror(draw_layer(character,name,'right',frame))
    if frame in (19,20,21):
        src=draw_layer(character,name,direction,0)
        if frame==19:
            out=Image.new('RGBA',(48,48));out.alpha_composite(src.resize((48,34),Image.Resampling.NEAREST),(0,11));return out
        src=src.rotate(90,resample=Image.Resampling.NEAREST).resize((44,18 if frame==20 else 10),Image.Resampling.NEAREST)
        out=Image.new('RGBA',(48,48));out.alpha_composite(src,(2,27 if frame==20 else 35));return out
    im=Image.new('RGBA',(48,48));d=ImageDraw.Draw(im)
    w,y,l,stride,arm=frame_geometry(character,frame);cx=24+l;back=direction=='up';side=direction=='right';outline='#17282d'
    def rect(box,c):d.rectangle(box,fill=c)
    def line(points,c,width=1):d.line(points,fill=c,width=width)
    def poly(points,c):d.polygon(points,fill=c)
    def ellipse(box,c):d.ellipse(box,fill=c)
    # Every shape is drawn at source resolution; a side view has a narrower far shoulder.
    left=cx-w+(3 if side else 0);right=cx+w
    if name=='body':
        poly([(left,18+y),(right,18+y),(right+2,32+y),(cx+5,35),(cx-6,35),(left-2,30+y)],outline)
        rect((cx-6,32,cx-1,41-max(0,stride)),outline);rect((cx+2,32,cx+7,41-max(0,-stride)),outline)
        ellipse((cx-8,5+y,cx+7,20+y),outline)
    elif name.startswith('skin-'):
        dark,skin,light=SKIN[name[5:]]
        ellipse((cx-7,7+y,cx+6,20+y),dark);rect((cx-5,8+y,cx+4,17+y),skin)
        if not back:
            rect((cx-3 if not side else cx+1,10+y,cx+4,17+y),light);rect((cx+4,13+y,cx+7,15+y),skin)
            rect((cx-2,18+y,cx+2,21+y),skin)
        else:rect((cx-5,9+y,cx+4,17+y),skin)
        for hx,ay in [(left-2,0),(right+1,arm)]:
            rect((hx,26+y+ay,hx+3,31+y+ay),dark);rect((hx+1,26+y+ay,hx+3,29+y+ay),light)
    elif name.startswith('face-') and not back:
        style=name[5:];ex=cx+2 if side else cx-3
        line((ex,13+y,ex+1,13+y),'#213238');line((cx+3,13+y,cx+4,13+y),'#213238')
        d.point((cx+4,13+y),fill='#e4e3bc');line((cx,18+y,cx+3,18+y),'#987261')
        if style=='scar':line((cx-4,12+y,cx-2,16+y),'#824f4b')
        if style=='vigil':line((ex-1,11+y,ex+2,12+y),'#423d3c');line((cx+2,11+y,cx+5,11+y),'#423d3c')
    elif name.startswith('hair-'):
        style=name[5:];dark,mid,light=('#332c31','#68503f','#a28359')
        poly([(cx-8,10+y),(cx-6,5+y),(cx+2,3+y),(cx+7,7+y),(cx+6,12+y),(cx+3,9+y),(cx-3,10+y)],dark)
        poly([(cx-5,6+y),(cx+2,5+y),(cx+5,8+y),(cx-2,8+y)],mid);line((cx-4,6+y,cx+1,5+y),light)
        if back:rect((cx-6,10+y,cx+5,16+y),mid);line((cx-4,9+y,cx-3,16+y),light)
        if style=='braid':
            for k in range(5):rect((cx-8+(k%2),12+y+k*2,cx-5,14+y+k*2),mid);d.point((cx-7,12+y+k*2),fill=light)
        elif style=='crest':poly([(cx-6,5+y),(cx-2,0+y),(cx+1,4+y),(cx+5,2+y),(cx+4,8+y)],mid);line((cx-2,2+y,cx+1,5+y),light)
    elif name.startswith('inner-'):
        dark,mid,light=PALETTES[name[6:]]
        poly([(left,20+y),(cx,18+y),(right,20+y),(right+1,33+y),(left-1,33+y)],dark)
        rect((left+2,22+y,right-2,32+y),mid);line((left+2,23+y,left+2,30+y),light)
        for hx,ay in [(left-3,0),(right,arm)]:
            rect((hx,21+y+ay,hx+4,26+y+ay),dark);line((hx+1,22+y+ay,hx+2,25+y+ay),mid)
        if character=='wanderer':line((left+2,22+y,right-3,31+y),'#ad9367',2)
        elif character=='sentinel':line((cx,21+y,cx,31+y),'#b2bdad');rect((cx-3,22+y,cx+3,29+y),'#6f8481')
        else:poly([(cx-2,20+y),(right+2,23+y),(cx+4,30+y),(cx,30+y)],'#8e9a77');line((cx,22+y,cx+2,28+y),light)
        rect((left,32+y,right,34+y),'#594739');rect((cx-1,32+y,cx+2,34+y),'#c9b57b')
    elif name.startswith('back-'):
        dark,mid,light=PALETTES[name[5:]]
        tail=2 if frame in (5,8) else 0
        if character=='strider':
            poly([(cx-5,19+y),(left-6,24+y),(left-8-tail,34+y),(left-2,31+y),(cx+2,22+y)],dark)
            line((left-3,24+y,left-6-tail,32+y),mid);line((left-4,25+y,left-6-tail,30+y),light)
        else:
            poly([(left,18+y),(right,18+y),(right+3+tail,35+y),(cx+1,38+y),(left-4-tail,35+y)],dark)
            poly([(left+2,20+y),(right-1,20+y),(right+1,34+y),(cx,36+y),(left-2,34+y)],mid)
            line((left+3,22+y,left+1,34+y),light);line((cx,21+y,cx+1,35+y),dark)
            if character=='wanderer':rect((left-3,28+y,left+2,34+y),'#5b4436');line((left-2,29+y,left+1,29+y),'#b39b6d')
    elif name.startswith('pants-'):
        world=name[6:];dark,mid,light,gem=MATERIALS[world]
        for x,lift in [(cx-7,stride),(cx+2,-stride)]:
            rect((x,33+y,x+5,42-max(0,lift)),outline);rect((x+1,34+y,x+4,40-max(0,lift)),dark);line((x+2,35+y,x+2,39-max(0,lift)),mid)
    elif name.startswith('gloves-'):
        dark,mid,light,gem=MATERIALS[name[7:]]
        for hx,ay in [(left-2,0),(right+1,arm)]:
            rect((hx-1,26+y+ay,hx+3,29+y+ay),dark);rect((hx,26+y+ay,hx+3,27+y+ay),mid);line((hx,26+y+ay,hx+2,26+y+ay),light)
    elif name.startswith('armor-'):
        world,tier=name[6:].rsplit('-',1);tier=int(tier);dark,mid,light,gem=MATERIALS[world]
        if world=='forest':
            poly([(left+1,20+y),(cx-1,22+y),(right-1,20+y),(right+1,31+y),(left-1,31+y)],dark)
            rect((left+2,22+y,right-2,30+y),mid);line((left+3,22+y,left+1,30+y),light);line((cx-1,23+y,cx+2,29+y),dark)
            for sy in range(24,30,2):line((cx-1,sy+y,cx+1,sy+1+y),light)
        elif world=='desert':
            poly([(left,20+y),(right,20+y),(right+2,29+y),(cx,34+y),(left-2,29+y)],dark)
            for sy in range(22,32,3):rect((left+2,sy+y,right-2,sy+1+y),mid);line((left+3,sy+y,right-3,sy+y),light)
            poly([(cx,23+y),(cx+3,26+y),(cx,29+y),(cx-3,26+y)],gem)
        elif world=='frozen':
            poly([(left-2,20+y),(left+2,18+y),(cx,22+y),(right-1,18+y),(right+3,21+y),(right,32+y),(left,32+y)],dark)
            poly([(left+2,21+y),(cx,23+y),(right-2,21+y),(right-1,29+y),(cx,33+y),(left+1,29+y)],mid)
            line((left+3,22+y,cx,30+y),light,2);line((cx,30+y,right-3,22+y),light)
        else:
            poly([(left-2,20+y),(left+1,18+y),(cx,22+y),(right,18+y),(right+3,21+y),(right,32+y),(left,32+y)],outline)
            poly([(left+1,21+y),(cx,24+y),(right-1,21+y),(right-1,31+y),(left+1,31+y)],dark)
            for sx in [left+3,cx,right-3]:line((sx,23+y,sx-1,29+y),mid)
            poly([(cx,24+y),(cx+3,27+y),(cx,31+y),(cx-3,27+y)],gem)
        if tier>=1:
            for sx in [left-2,right-2]:rect((sx,20+y,sx+4,24+y),dark);line((sx,20+y,sx+4,20+y),light)
            rect((cx-1,23+y,cx+1,25+y),gem)
        if tier>=2:
            for sx,sign in [(left-2,-1),(right+2,1)]:poly([(sx,23+y),(sx+sign*5,18+y),(sx+sign*4,25+y)],mid);line((sx,22+y,sx+sign*4,19+y),light)
            line((left+2,30+y,right-2,30+y),gem)
    elif name.startswith('head-'):
        world,tier=name[5:].rsplit('-',1);tier=int(tier);dark,mid,light,gem=MATERIALS[world]
        if world=='forest':
            poly([(cx-9,12+y),(cx-8,5+y),(cx+2,1+y),(cx+8,7+y),(cx+8,13+y),(cx+5,9+y),(cx-4,9+y)],dark)
            line((cx-7,7+y,cx+1,3+y,cx+6,7+y),mid,2);line((cx-7,8+y,cx-8,11+y),light)
        elif world=='desert':
            ellipse((cx-10,3+y,cx+9,16+y),dark);rect((cx-7,5+y,cx+6,11+y),mid)
            rect((cx-7,11+y,cx+7,14+y),outline);line((cx-6,6+y,cx+5,6+y),light);line((cx,5+y,cx,11+y),light)
            rect((cx-9,14+y,cx-6,18+y),mid);rect((cx+6,14+y,cx+9,18+y),mid)
        elif world=='frozen':
            poly([(cx-9,14+y),(cx-7,5+y),(cx-2,2+y),(cx+3,3+y),(cx+8,7+y),(cx+9,16+y),(cx+5,12+y),(cx-5,12+y)],dark)
            poly([(cx-6,8+y),(cx-2,3+y),(cx,9+y),(cx+4,4+y),(cx+6,10+y)],mid);line((cx-2,4+y,cx-1,8+y),light)
        else:
            poly([(cx-9,15+y),(cx-8,6+y),(cx-3,3+y),(cx+4,3+y),(cx+8,7+y),(cx+9,16+y),(cx+5,12+y),(cx-5,12+y)],outline)
            poly([(cx-6,7+y),(cx,5+y),(cx+6,7+y),(cx+5,11+y),(cx-5,11+y)],mid);line((cx-4,10+y,cx-2,10+y),gem);line((cx+2,10+y,cx+4,10+y),gem)
        if tier>=1:rect((cx-2,5+y,cx+2,7+y),gem);d.point((cx-1,5+y),fill=light)
        if tier>=2:
            for sx,sign in [(cx-8,-1),(cx+8,1)]:poly([(sx,8+y),(sx+sign*4,2+y),(sx+sign*3,10+y)],mid);line((sx,6+y,sx+sign*3,3+y),light)
    elif name.startswith('boots-'):
        world,tier=name[6:].rsplit('-',1);tier=int(tier);dark,mid,light,gem=MATERIALS[world]
        for sx,lift in [(cx-7,stride),(cx+2,-stride)]:
            yy=39-max(0,lift);rect((sx-1,yy,sx+6,44-max(0,lift)),outline);rect((sx,yy,sx+5,42-max(0,lift)),dark)
            line((sx,yy,sx+4,yy),mid);line((sx,43-max(0,lift),sx+5,43-max(0,lift)),light)
            if tier>=1:rect((sx+1,yy-3,sx+4,yy),mid);line((sx+1,yy-3,sx+4,yy-3),light)
            if tier>=2:poly([(sx+4,yy),(sx+8,yy-2),(sx+7,yy+2)],gem)
    elif name.startswith(('ring-','neck-')):
        prefix,world,tier=name.split('-');tier=int(tier);dark,mid,light,gem=MATERIALS[world]
        if prefix=='neck':
            line((cx-3,21+y,cx,25+y,cx+3,21+y),light);poly([(cx,24+y),(cx+2,26+y),(cx,29+y),(cx-2,26+y)],gem)
            d.point((cx,25+y),fill=light)
            if tier>=1:line((cx-3,26+y,cx+3,26+y),mid)
            if tier>=2:poly([(cx-3,26+y),(cx-6,23+y),(cx-4,29+y)],light);poly([(cx+3,26+y),(cx+6,23+y),(cx+4,29+y)],light)
        else:
            hx=right+2;rect((hx,29+y+arm,hx+2,30+y+arm),light);d.point((hx+1,29+y+arm),fill=gem)
            if tier>=2:line((hx-1,28+y+arm,hx+3,28+y+arm),gem)
    return im

def layer_names():
    return ['body']+[f'skin-{v}' for v in SKIN]+[f'face-{v}' for v in ('calm','scar','vigil')]+[f'hair-{v}' for v in ('short','braid','crest')]+[f'inner-{v}' for v in PALETTES]+[f'back-{v}' for v in PALETTES]+[f'{slot}-{world}' for world in MATERIALS for slot in ('pants','gloves')]+[f'{slot}-{world}-{tier}' for world in MATERIALS for tier in range(3) for slot in ('armor','head','boots','ring','neck')]

def generate(out):
    for character in CHARACTERS:
        folder=out/'layers'/character;folder.mkdir(parents=True,exist_ok=True)
        for name in layer_names():
            sheet=Image.new('RGBA',(26*48,4*48))
            for row,direction in enumerate(DIRECTIONS):
                for frame in range(26):sheet.alpha_composite(draw_layer(character,name,direction,frame),(frame*48,row*48))
            sheet.save(folder/(name+'.png'),optimize=True)
    print('Generated original 48px modular character parts with 26 synchronized frames and four directions.')

def generate_equipment(out):
    import importlib.util
    spec=importlib.util.spec_from_file_location('weapon_source',Path(__file__).with_name('character-art.py')); base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
    atlas=Image.new('RGBA',(18*32,32))
    for index in range(18):
        if index<6:im=base.weapon(index)
        elif index<14:
            tier=1 if index<10 else 2; frame=(index-6)%4;im=base.weapon(frame);d=ImageDraw.Draw(im)
            metal='#ceddce' if tier==1 else '#ead29b';gem=['#b9e3cc','#f0d392','#b9f2ef','#ffc084'][frame]
            d.line((12,22,20,22),fill=metal,width=2);d.rectangle((14,23,18,26),fill='#674e4b');d.point((16,24),fill=gem)
            if frame in (0,2):
                d.polygon([(9,4),(6,1),(6,8),(12,13)],fill=metal);d.polygon([(22,4),(25,1),(25,8),(20,13)],fill=metal)
            elif frame==1:
                d.polygon([(12,4),(9,11),(13,17),(14,8)],fill=metal);d.polygon([(19,4),(23,11),(19,17),(18,8)],fill=metal)
            else:d.polygon([(20,2),(29,3),(31,9),(27,14),(28,7)],fill=metal)
            if tier==2:
                d.polygon([(11,19),(7,17),(8,22),(13,24)],fill=gem);d.polygon([(21,19),(25,17),(24,22),(19,24)],fill=gem)
                d.line((15,12,16,18),fill=gem);d.point((14,11),fill='#fff7d5')
        else:
            im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im)
            if index==17:
                d.ellipse((7,18,26,31),fill='#876547',outline='#2e3032',width=2)
                for x in range(9,26,4):d.line((x,20,x-2,29),fill='#c4a46b')
                d.arc((9,8,23,27),180,360,fill='#c4a46b',width=2)
                d.polygon([(9,20),(9,12),(14,16),(17,9),(22,13),(21,22)],fill='#80a66b')
            else:
                d.line((13,30,18,9),fill='#513e33',width=4);d.line((14,29,19,10),fill='#b38c59',width=1)
                if index==14:d.polygon([(13,4),(8,5),(6,14),(11,18),(20,12),(21,5)],fill='#a5b5b2',outline='#354851');d.line((8,6,7,13,11,16),fill='#e2dfc0',width=2)
                elif index==15:d.line((7,11,11,5,19,5,27,12),fill='#a4b9b7',width=4);d.line((8,10,12,4,19,4,26,10),fill='#e1e7ca')
                else:d.rectangle((8,4,27,14),fill='#536974',outline='#25383e',width=2);d.rectangle((9,5,25,8),fill='#bdccbf');d.line((23,9,25,12),fill='#8aa5a6')
        atlas.alpha_composite(im,(index*32,0))
    atlas.save(out/'weapons.png',optimize=True)

if __name__=='__main__':
    folder=Path('public/assets/characters');folder.mkdir(parents=True,exist_ok=True)
    generate(folder);generate_equipment(folder)
    (folder/'layers'/'LICENSE.md').write_text('SPDX-License-Identifier: CC0-1.0\nOriginal 48px layered NowRift character art and equipment variants, generated by scripts/character-layers.py. No third-party pixels.\nhttps://creativecommons.org/publicdomain/zero/1.0/\n')
