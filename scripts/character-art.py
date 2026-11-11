"""Original CC0 body and hand-held equipment art. No downloaded pixels.
Run directly to regenerate atlases; shared helpers are imported by the older generators.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

PALETTES = {'moss': ('#4f6c51', '#b5c390'), 'ember': ('#90493f', '#e5b66c'), 'tide': ('#41657d', '#a0cdd1')}
DIRECTIONS = ('down', 'right', 'up', 'left')
def body(character='wanderer', outfit='moss', direction='down', frame=0):
    if direction == 'left': return ImageOps.mirror(body(character, outfit, 'right', frame))
    if frame >= 9:
        base = body(character, outfit, direction, 0)
        if frame == 9:
            im=Image.new('RGBA',(32,32)); im.alpha_composite(base.resize((32,23),Image.Resampling.NEAREST),(0,8)); return im
        fallen=base.rotate(90, resample=Image.Resampling.NEAREST).resize((30,15 if frame==10 else 10),Image.Resampling.NEAREST)
        im=Image.new('RGBA',(32,32)); im.alpha_composite(fallen,(1,16 if frame==10 else 21)); return im
    im=Image.new('RGBA',(32,32)); d=ImageDraw.Draw(im); cloak,trim=PALETTES[outfit]
    bob=[0,-1,0,-1,0,1,-1,0,1][frame]; y=bob
    back=direction=='up'; side=direction=='right'; walking=2<=frame<=5; attacking=frame in (6,7)
    dark='#1c3038'; leather='#76624b'; skin='#c2b79c'; steel='#85969a'; light='#c3c8ad'
    # Separate boots and legs; the attack hand is always empty in this atlas.
    stride=(1 if frame%2 else -1)*2 if walking else 0
    for x,lift in [(12,stride),(19,-stride)]:
        d.rectangle((x,22,x+3,28-abs(lift)),fill=dark)
        d.rectangle((x-1,27-abs(lift),x+4,29-abs(lift)),fill=leather)
        d.line((x,27-abs(lift),x+3,27-abs(lift)),fill='#b4a07a')
    if character=='sentinel':
        d.polygon([(8,10+y),(23,10+y),(26,24+y),(7,25+y)],fill=cloak)
        d.rectangle((9,12+y,23,23+y),fill='#46555d'); d.rectangle((11,13+y,21,22+y),fill=steel)
        d.polygon([(12,14+y),(20,14+y),(19,20+y),(16,22+y),(13,20+y)],fill='#a1afa6')
        for x in [5,22]:
            d.rectangle((x,11+y,x+5,17+y),fill='#3f5056');d.rectangle((x+1,11+y,x+4,14+y),fill=light)
        d.rectangle((9,4+y,23,12+y),fill='#42515b');d.rectangle((11,3+y,21,10+y),fill=steel)
        d.rectangle((14,1+y,18,5+y),fill=trim)
        if not back:
            d.rectangle((12 if not side else 17,8+y,22,10+y),fill=dark);d.line((18,8+y,21,8+y),fill='#e3cf8d')
        else: d.line((11,6+y,21,6+y),fill='#a4b4ad')
        hand=24;d.rectangle((6,17+y,9,21+y),fill=steel)
    elif character=='strider':
        d.polygon([(12,10+y),(20,9+y),(23,23+y),(15,25+y),(10,20+y)],fill=cloak)
        d.rectangle((13,13+y,20,22+y),fill='#3b454d');d.line((14,14+y,18,22+y),fill=trim,width=1)
        d.polygon([(10,10+y),(13,4+y),(20,1+y),(23,11+y)],fill=dark)
        d.polygon([(13,8+y),(17,3+y),(20,5+y),(21,11+y)],fill=cloak)
        if not back:
            d.rectangle((15 if not side else 18,8+y,22,10+y),fill=skin);d.rectangle((14,10+y,22,12+y),fill=dark);d.point((21,9+y),fill='#d8e7b2')
        d.polygon([(12,12+y),(8,13+y),(5,20+y),(10,18+y),(15,14+y)],fill=cloak)
        d.line((8,15+y,6,19+y),fill=trim)
        hand=21;d.rectangle((10,16+y,12,20+y),fill=leather)
    else:
        d.polygon([(10,10+y),(21,10+y),(24,23+y),(16,26+y),(8,23+y)],fill=cloak)
        d.rectangle((11,13+y,21,22+y),fill='#57696a');d.rectangle((13,13+y,20,18+y),fill='#8e9b86')
        d.line((11,13+y,21,22+y),fill='#c5ad78',width=2)
        d.rectangle((10,4+y,22,12+y),fill=dark);d.rectangle((12,3+y,21,8+y),fill=cloak)
        if not back:
            d.rectangle((13 if not side else 17,8+y,22,12+y),fill=skin);d.line((15,11+y,21,11+y),fill=dark);d.point((21,9+y),fill='#d8ead0')
        d.rectangle((8,18+y,12,23+y),fill=leather);d.rectangle((9,18+y,11,19+y),fill=trim)
        hand=22;d.rectangle((8,15+y,10,19+y),fill=skin)
    d.rectangle((11,22+y,22 if character=='sentinel' else 20,24+y),fill=leather);d.rectangle((16,22+y,18,23+y),fill=trim)
    hx=(32-hand-2) if back else hand
    d.rectangle((hx,18+y-(1 if attacking else 0),hx+2,21+y-(1 if attacking else 0)),fill=skin if character!='sentinel' else steel)
    if back:
        d.polygon([(10,12+y),(22,12+y),(24,23+y),(16,26+y),(8,23+y)],fill=cloak);d.line((16,13+y,17,23+y),fill=trim)
    if frame==8:
        flash=Image.new('RGBA',im.size,'#f8ebd2');flash.putalpha(im.getchannel('A'));im=Image.blend(im,flash,.65)
    return im

def weapon(frame):
    im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im)
    if frame==0:
        d.rectangle((15,9,17,30),fill='#594431');d.line((16,10,16,29),fill='#b39766')
        d.polygon([(9,7),(13,2),(20,2),(24,7),(20,13),(12,12)],fill='#45625a')
        d.polygon([(13,6),(16,1),(20,6),(17,11)],fill='#9bd8c7');d.line((16,3,17,8),fill='#edffe1')
        d.line((13,17,19,20),fill='#8a9e6e',width=2);d.rectangle((13,24,19,25),fill='#c7ae70')
    elif frame==1:
        d.polygon([(16,0),(20,5),(18,18),(16,21),(12,18),(13,5)],fill='#3d545d')
        d.polygon([(16,2),(18,6),(16,19),(14,17),(14,6)],fill='#d6dfcc');d.line((16,4,16,17),fill='#fff5d7')
        d.rectangle((10,20,22,22),fill='#b58c49');d.rectangle((15,23,17,29),fill='#825342');d.rectangle((13,29,19,31),fill='#e2be71');d.point((16,21),fill='#ecb96d')
    elif frame==2:
        d.rectangle((15,11,17,30),fill='#527481');d.line((16,13,16,29),fill='#b8cdd4')
        d.polygon([(8,5),(11,2),(11,8),(16,12),(21,8),(21,2),(24,5),(23,11),(16,15),(9,11)],fill='#9cc7d4')
        d.polygon([(16,0),(20,6),(16,11),(12,6)],fill='#77d5e3');d.line((16,2,16,8),fill='#e5ffff');d.rectangle((13,22,19,23),fill='#98dce0')
    elif frame==3:
        d.rectangle((15,5,17,31),fill='#4d4147');d.line((16,9,16,30),fill='#c18c62')
        d.polygon([(16,0),(25,4),(28,9),(24,15),(19,18),(23,10),(20,7),(15,7)],fill='#714d49')
        d.polygon([(18,2),(24,5),(26,9),(22,14),(23,9),(20,5)],fill='#f4ab62');d.line((19,2,24,6),fill='#ffe6a2');d.rectangle((13,22,19,24),fill='#c4a072')
    elif frame==4:
        for x in [8,21]:
            d.polygon([(x,4),(x+3,11),(x+1,23),(x-2,21),(x-2,11)],fill='#c5d2c4');d.rectangle((x-4,23,x+4,24),fill='#b99a62');d.rectangle((x-1,25,x+1,30),fill='#6c5143')
    else:
        d.polygon([(15,1),(16,9),(23,4),(28,16),(24,24),(15,29),(6,24),(4,15),(10,7),(10,14)],fill='#b3553d');d.polygon([(15,10),(21,12),(23,20),(16,25),(10,21),(11,15)],fill='#f6b66c');d.rectangle((14,16,18,21),fill='#fff1b5')
    return im

if __name__=='__main__':
    out=Path('public/assets/characters');out.mkdir(parents=True,exist_ok=True)
    for character in ['wanderer','sentinel','strider']:
        for outfit in PALETTES:
            sheet=Image.new('RGBA',(384,128))
            for row,direction in enumerate(DIRECTIONS):
                for frame in range(12):sheet.alpha_composite(body(character,outfit,direction,frame),(frame*32,row*32))
            sheet.save(out/f'{character}-{outfit}.png')
    atlas=Image.new('RGBA',(192,32))
    for frame in range(6):atlas.alpha_composite(weapon(frame),(frame*32,0))
    atlas.save(out/'weapons.png')
    (out/'LICENSE.md').write_text('SPDX-License-Identifier: CC0-1.0\n\nOriginal NowRift procedural character and equipment artwork, generated by scripts/character-art.py. No third-party pixels are used.\n\nDedicated to the public domain under CC0 1.0 Universal:\nhttps://creativecommons.org/publicdomain/zero/1.0/\n')
    print('Generated nine weapon-free, four-direction character atlases and six independent equipment/practice visuals.')
