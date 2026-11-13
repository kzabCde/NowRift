"""Original CC0 Rift Outfitters art, authored on the native pixel grid.

Pillow is regeneration-only. Existing legacy layers remain byte-for-byte intact.
New legwear/boots use the established 48px, 26-column, four-direction skeleton.
"""
import argparse
import importlib.util
import io
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('anatomy', ROOT/'scripts/character-layers.py')
anatomy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(anatomy)
WORLDS = tuple(anatomy.MATERIALS)
SLOTS = ('armor', 'helmet', 'pants', 'boots')
INK = '#17282d'

def layer(character, kind, world, tier, direction, frame):
    if direction == 'left':
        return ImageOps.mirror(layer(character, kind, world, tier, 'right', frame))
    if frame in (19,20,21):
        src=layer(character,kind,world,tier,direction,0)
        out=Image.new('RGBA',(48,48))
        if frame == 19:
            out.alpha_composite(src.resize((48,34),Image.Resampling.NEAREST),(0,11))
        else:
            src=src.rotate(90,resample=Image.Resampling.NEAREST).resize((44,18 if frame==20 else 10),Image.Resampling.NEAREST)
            out.alpha_composite(src,(2,27 if frame==20 else 35))
        return out
    im=Image.new('RGBA',(48,48));d=ImageDraw.Draw(im)
    w,y,lean,stride,arm=anatomy.frame_geometry(character,frame)
    cx=24+lean;back=direction=='up';side=direction=='right'
    dark,mid,light,gem=anatomy.MATERIALS[world]
    def box(coords,color):d.rectangle(coords,fill=color)
    def line(points,color,width=1):d.line(points,fill=color,width=width)
    def poly(points,color):d.polygon(points,fill=color)
    for index,(sx,lift) in enumerate([(cx-7,stride),(cx+2,-stride)]):
        if side and index==0:sx+=2
        bottom=42-max(0,lift)
        if kind=='base':
            box((sx,33+y,sx+5,bottom),INK)
            box((sx+1,34+y,sx+4,bottom-1),'#535b57')
            line((sx+2,35+y,sx+2,bottom-2),'#858b74')
        elif kind=='pants':
            if world=='forest':
                poly([(sx,32+y),(sx+6,32+y),(sx+5,bottom),(sx,bottom),(sx-1,36+y)],INK)
                box((sx+1,33+y,sx+4,bottom-1),dark)
                box((sx,35+y,sx+3,38+y),mid)
                line((sx,35+y,sx+3,35+y),light)
                if not back:line((sx+1,39+y,sx+4,40+y),gem)
            elif world=='desert':
                poly([(sx-1,32+y),(sx+6,32+y),(sx+7,36+y),(sx+4,bottom),(sx+1,bottom),(sx-2,36+y)],INK)
                poly([(sx,33+y),(sx+5,33+y),(sx+5,36+y),(sx+3,bottom-1),(sx+1,bottom-1),(sx-1,36+y)],mid)
                line((sx+1,34+y,sx+1,bottom-2),dark)
                line((sx+3,34+y,sx+3,37+y),light)
                box((sx,39-max(0,lift),sx+4,40-max(0,lift)),gem)
            elif world=='frozen':
                poly([(sx-1,32+y),(sx+6,32+y),(sx+6,36+y),(sx+4,bottom+1),(sx,bottom+1),(sx-1,36+y)],INK)
                box((sx,33+y,sx+5,35+y),light)
                poly([(sx,36+y),(sx+4,35+y),(sx+5,38+y),(sx+3,bottom),(sx,bottom)],mid)
                line((sx+1,36+y,sx+1,bottom-1),light)
                if not back:poly([(sx+3,36+y),(sx+5,38+y),(sx+3,40+y),(sx+2,38+y)],gem)
            else:
                poly([(sx-1,32+y),(sx+6,32+y),(sx+5,37+y),(sx+7,bottom),(sx+3,bottom+1),(sx-1,bottom),(sx,37+y)],INK)
                poly([(sx,33+y),(sx+4,33+y),(sx+3,37+y),(sx+5,bottom-1),(sx+2,bottom),(sx,bottom-1)],dark)
                line((sx+1,34+y,sx+3,36+y,sx+1,39+y),mid)
                if not back:line((sx+3,37+y,sx+4,39+y),gem)
            if tier>=1:
                line((sx,33+y,sx+5,33+y),light)
                box((sx+1,36+y,sx+3,37+y),gem)
            if tier>=2:
                poly([(sx,36+y),(sx-2,34+y),(sx-1,39+y)],mid)
                line((sx+1,40-max(0,lift),sx+4,40-max(0,lift)),light)
        else:
            yy=39-max(0,lift)
            if world=='forest':
                poly([(sx,yy-2),(sx+5,yy-2),(sx+4,yy+1),(sx+7,yy+3),(sx+7,yy+5),(sx-1,yy+5),(sx-1,yy)],INK)
                box((sx,yy-1,sx+4,yy+3),dark);box((sx,yy-2,sx+5,yy-1),mid)
                line((sx,yy+4,sx+6,yy+4),light)
                line((sx+1,yy,sx+3,yy+1,sx+1,yy+2),mid)
            elif world=='desert':
                poly([(sx,yy-3),(sx+4,yy-3),(sx+4,yy+1),(sx+7,yy+3),(sx+6,yy+5),(sx-1,yy+5),(sx,yy)],INK)
                box((sx+1,yy-2,sx+3,yy+2),dark);box((sx,yy+3,sx+6,yy+4),mid)
                for v in (-2,0,2):line((sx,yy+v,sx+4,yy+v),light)
                line((sx+5,yy+2,sx+5,yy+4),gem)
            elif world=='frozen':
                poly([(sx-1,yy-4),(sx+6,yy-4),(sx+6,yy+1),(sx+7,yy+3),(sx+6,yy+5),(sx-1,yy+5),(sx-2,yy+2)],INK)
                box((sx,yy-3,sx+5,yy),light);box((sx,yy+1,sx+5,yy+3),mid)
                line((sx,yy+4,sx+6,yy+4),light)
                if not back:poly([(sx+2,yy),(sx+4,yy+2),(sx+2,yy+3),(sx+1,yy+2)],gem)
            else:
                poly([(sx,yy-3),(sx+5,yy-3),(sx+5,yy+1),(sx+9,yy),(sx+8,yy+4),(sx+3,yy+5),(sx-1,yy+4)],INK)
                box((sx+1,yy-2,sx+4,yy+2),dark)
                poly([(sx+3,yy+2),(sx+8,yy+1),(sx+6,yy+4),(sx+1,yy+4)],mid)
                line((sx+2,yy-1,sx+4,yy+1),gem)
                line((sx,yy+4,sx+5,yy+4),light)
            if tier>=1:line((sx+1,yy-2,sx+4,yy-2),gem)
            if tier>=2:
                poly([(sx+4,yy-2),(sx+7,yy-4),(sx+6,yy)],mid)
                line((sx+1,yy+3,sx+4,yy+3),light)
    return im

def icon(world, slot):
    im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im)
    dark,mid,light,gem=anatomy.MATERIALS[world]
    def poly(points,color,outline=INK):
        d.polygon(points,fill=color)
        if outline:d.line(points+[points[0]],fill=outline)
    def line(points,color,width=1):d.line(points,fill=color,width=width)
    if slot=='armor':
        shoulders={'forest':[(7,6),(12,8),(20,8),(24,6),(27,12),(23,15),(23,27),(9,27),(9,15),(5,12)],
                   'desert':[(5,7),(11,5),(15,8),(20,5),(26,7),(28,13),(24,15),(25,26),(16,29),(7,26),(8,15),(4,13)],
                   'frozen':[(3,8),(9,3),(15,8),(21,3),(28,8),(25,17),(23,28),(9,28),(7,17)],
                   'infernal':[(3,3),(10,7),(15,5),(21,7),(29,3),(27,14),(24,17),(24,27),(16,30),(8,27),(8,17),(5,14)]}[world]
        poly(shoulders,dark)
        if world=='forest':
            poly([(11,10),(15,12),(21,9),(21,24),(10,24)],mid);line([(11,12),(19,23)],light,2)
            for y in (14,18,22):line([(14,y),(17,y+1)],INK)
        elif world=='desert':
            for y in (10,14,18,22):d.rectangle((9,y,23,y+2),fill=mid);line([(10,y),(22,y)],light)
            poly([(16,12),(19,16),(16,20),(13,16)],gem)
        elif world=='frozen':
            poly([(9,7),(15,11),(22,7),(24,12),(20,14),(11,14),(7,12)],light)
            poly([(10,15),(21,15),(21,23),(16,27),(10,23)],mid);line([(12,16),(16,24),(20,16)],gem)
        else:
            poly([(10,11),(16,14),(22,11),(22,24),(16,28),(10,24)],mid)
            poly([(16,14),(19,19),(16,25),(13,19)],gem);line([(6,7),(8,12)],light);line([(26,7),(24,12)],light)
    elif slot=='helmet':
        if world=='forest':
            poly([(5,27),(6,13),(11,5),(19,3),(25,12),(27,27),(22,24),(21,15),(12,15),(11,25)],dark)
            line([(8,14),(12,8),(18,6),(23,13)],mid,2);line([(11,14),(21,14)],light)
        elif world=='desert':
            poly([(6,27),(5,12),(9,6),(16,3),(23,6),(27,12),(26,27),(21,25),(21,18),(11,18),(11,25)],mid)
            d.rectangle((8,14,24,18),fill=INK);line([(8,11),(16,6),(24,11)],light,2);d.rectangle((15,5,17,13),fill=gem)
        elif world=='frozen':
            poly([(5,24),(6,7),(11,12),(16,2),(21,12),(26,7),(27,24),(21,26),(20,19),(12,19),(11,26)],dark)
            poly([(8,13),(11,16),(16,7),(21,16),(24,13),(23,22),(9,22)],mid)
            line([(16,8),(16,17)],gem,2);line([(9,19),(23,19)],light)
        else:
            poly([(3,2),(10,7),(16,5),(22,7),(29,2),(27,14),(25,28),(21,25),(20,18),(12,18),(11,25),(7,28),(5,14)],mid)
            poly([(9,11),(16,9),(23,11),(22,17),(10,17)],dark)
            line([(10,15),(14,16)],gem);line([(18,16),(22,15)],gem)
    elif slot=='pants':
        if world=='forest':
            poly([(7,4),(25,4),(24,14),(25,28),(18,28),(16,17),(14,28),(7,28),(8,14)],dark)
            d.rectangle((9,7,14,13),fill=mid);d.rectangle((18,8,23,14),fill=mid)
            line([(8,5),(24,5)],light);line([(10,16),(12,23)],gem);line([(20,17),(20,24)],mid)
        elif world=='desert':
            poly([(7,4),(24,4),(28,15),(25,27),(18,29),(16,17),(14,29),(7,27),(4,15)],mid)
            line([(8,5),(24,5)],light,2);line([(10,9),(8,17),(11,25)],dark,2);line([(21,9),(24,17),(21,25)],dark,2)
            line([(8,24),(13,24)],gem,2);line([(19,24),(24,24)],gem,2)
        elif world=='frozen':
            poly([(6,4),(26,4),(25,12),(26,28),(18,29),(16,16),(14,29),(6,28),(7,12)],mid)
            d.rectangle((7,5,25,8),fill=light)
            for x in (10,21):poly([(x,12),(x+3,17),(x,23),(x-3,17)],gem);line([(x-2,23),(x+2,23)],light,2)
        else:
            poly([(6,3),(26,3),(24,13),(28,27),(20,30),(16,19),(12,30),(4,27),(8,13)],dark)
            poly([(8,6),(14,7),(12,17),(9,26),(7,25)],mid);poly([(18,7),(24,6),(25,25),(23,26),(20,17)],mid)
            line([(8,5),(24,5)],light);line([(11,13),(10,18)],gem,2);line([(21,13),(22,18)],gem,2)
    else:
        for i,x in enumerate((5,18)):
            if world=='forest':
                poly([(x,5),(x+8,5),(x+7,20),(x+10,24),(x+9,28),(x-1,28),(x-1,23)],dark)
                d.rectangle((x,6,x+8,8),fill=mid);line([(x+2,12),(x+5,14),(x+2,16),(x+5,18)],light)
                line([(x,26),(x+8,26)],gem)
            elif world=='desert':
                poly([(x+1,4),(x+7,4),(x+6,20),(x+10,24),(x+9,28),(x-1,28),(x,21)],dark)
                for y in (6,10,14,19):line([(x+1,y),(x+6,y)],light,2)
                d.rectangle((x,24,x+8,26),fill=mid);line([(x+5,22),(x+5,26)],gem)
            elif world=='frozen':
                poly([(x-1,5),(x+8,5),(x+8,21),(x+10,24),(x+9,29),(x-1,29),(x-2,24)],mid)
                d.rectangle((x,5,x+7,10),fill=light);poly([(x+3,12),(x+6,17),(x+3,22),(x+1,17)],gem)
                line([(x,27),(x+8,27)],light,2)
            else:
                poly([(x,3),(x+7,6),(x+6,19),(x+11,20),(x+9,27),(x+3,29),(x-1,27)],dark)
                poly([(x+1,7),(x+5,9),(x+4,21),(x+8,22),(x+6,26),(x,26)],mid)
                line([(x+2,12),(x+4,16)],gem,2);line([(x,27),(x+6,27)],light)
    return im

def png(im):
    stream=io.BytesIO();im.save(stream,format='PNG',optimize=True);return stream.getvalue()
def svg(im,label):
    pixels=[]
    for y in range(32):
        for x in range(32):
            r,g,b,a=im.getpixel((x,y))
            if a:pixels.append(f'<rect x="{x}" y="{y}" width="1" height="1" fill="#{r:02x}{g:02x}{b:02x}"/>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges"><title>'+label+'</title>'+''.join(pixels)+'</svg>\n').encode()

def outputs():
    files={};atlas=Image.new('RGBA',(128,128));frames=[]
    legacy=Image.open(ROOT/'public/assets/items/atlas.png').convert('RGBA')
    for row,world in enumerate(WORLDS):
        for col,slot in enumerate(SLOTS):
            im=icon(world,slot);atlas.alpha_composite(im,(col*32,row*32))
            files[Path(f'art/outfitters/{world}-{slot}.svg')]=svg(im,f'{world} / {slot}')
            frames.append({'definitionId':f'{world}-{slot}','frame':row*4+col,'rect':[col*32,row*32,32,32]})
            if slot=='pants':legacy.paste(im,(((44+row)%8)*32,((44+row)//8)*32))
    files[Path('public/assets/items/outfitters.png')]=png(atlas)
    files[Path('public/assets/items/outfitters.json')]=(json.dumps({'size':[128,128],'cell':[32,32],'frames':frames},indent=2)+'\n').encode()
    files[Path('public/assets/items/atlas.png')]=png(legacy)
    for character in anatomy.CHARACTERS:
        for kind,world,tier,name in [('base','forest',0,'pants-base')]+[(kind,world,tier,f'{"legwear" if kind=="pants" else "outfit-boots"}-{world}-{tier}') for world in WORLDS for tier in range(3) for kind in ('pants','boots')]:
            sheet=Image.new('RGBA',(1248,192))
            for row,direction in enumerate(anatomy.DIRECTIONS):
                for frame in range(26):sheet.alpha_composite(layer(character,kind,world,tier,direction,frame),(frame*48,row*48))
            files[Path(f'public/assets/characters/layers/{character}/{name}.png')]=png(sheet)
    return files

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    files=outputs()
    for path,data in files.items():
        path=ROOT/path
        if args.check:assert path.exists() and path.read_bytes()==data, f'Stale Outfitters source: {path}'
        else:path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
    print(f'{"Verified" if args.check else "Generated"} 16 original icons and 75 synchronized modular legwear/footwear atlases; legacy gear preserved.')
