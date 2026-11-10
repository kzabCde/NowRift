"""Original CC0 NowRift Phase II art. No reference images are copied."""
from PIL import Image,ImageDraw,ImageEnhance
from pathlib import Path
import random,math,shutil
root=Path('public/assets/worlds');root.mkdir(parents=True,exist_ok=True)
colors={'forest':('#263c2e','#798266','#96bd71'),'desert':('#ad8958','#d4b57e','#e7cc85'),'frozen':('#3c5369','#829cae','#92e7ef'),'infernal':('#342c32','#62515a','#fa9f43')}
for wi,(world,(ground,path,accent)) in enumerate(colors.items()):
 out=root/world;out.mkdir(exist_ok=True);rng=random.Random(419+wi)
 tiles=Image.new('RGB',(96,32));d=ImageDraw.Draw(tiles)
 for i,c in enumerate([ground,path,accent]):
  d.rectangle((i*32,0,i*32+31,31),fill=c)
  for k in range(100):
   x=i*32+rng.randrange(32);y=rng.randrange(32);d.point((x,y),fill=rng.choice([ground,path,accent]))
  if world=='desert' and i==1:
   for y in range(0,32,8):d.line((i*32,y,i*32+31,y),fill='#95734e');d.line((i*32+((y//8)%2)*16,y,i*32+((y//8)%2)*16,y+8),fill='#95734e')
  if world=='frozen' and i==2:d.line((65,0,78,18,70,31),fill='#c3fbff',width=2)
  if world=='infernal' and i==2:
   for k in range(12):x=64+rng.randrange(28);y=rng.randrange(28);d.ellipse((x,y,x+3,y+3),fill='#ffdb70')
 tiles.save(out/'tiles.png')
 spells=Image.open('public/assets/forest/projectiles.png').copy();sd=ImageDraw.Draw(spells);sd.rectangle((64,0,79,15),fill=(0,0,0,0))
 if world=='desert':sd.line((65,14,77,2),fill='#f0d9a0',width=2);sd.polygon([(77,2),(70,3),(76,8)],fill='#ffe9be')
 elif world=='frozen':
  for angle in range(0,360,60):sd.line((72,8,72+math.cos(math.radians(angle))*7,8+math.sin(math.radians(angle))*7),fill='#a7f2ff',width=2)
 elif world=='infernal':sd.polygon([(65,13),(68,6),(70,1),(73,7),(77,3),(79,12),(73,15)],fill='#ffb34f');sd.rectangle((70,9,74,13),fill='#ffe7a2')
 else:sd.polygon([(65,14),(69,7),(73,6),(78,1),(77,7),(73,10),(71,13)],fill='#c18ec9')
 spells.save(out/'projectiles.png')

 for prop in ['tree','rock']:
  if world=='forest':shutil.copyfile(Path('public/assets/forest')/(prop+'.png'),out/(prop+'.png'));continue
  im=Image.new('RGBA',(64,80));d=ImageDraw.Draw(im);d.ellipse((8,63,58,77),fill='#10162277')
  if world=='desert':
   d.polygon([(13,67),(13,21),(23,16),(23,8),(46,8),(49,20),(49,67)],fill='#80644e');d.rectangle((20,20,44,64),fill='#bd9b6d');d.rectangle((13,12,51,22),fill='#ddbb82');d.rectangle((10,62,54,70),fill='#c2a174')
   for y in range(25,62,9):d.line((21,y,43,y),fill='#9d7e5a');d.rectangle((27,y+2,29,y+4),fill=accent)
   if prop=='rock':d.rectangle((35,8,64,41),fill=(0,0,0,0))
  elif world=='frozen':
   for x,y,h in [(15,67,31),(30,69,64),(46,65,45)]:
    d.polygon([(x-11,y),(x-8,y-h+12),(x,y-h),(x+11,y-h+14),(x+8,y)],fill='#527c9d');d.polygon([(x,y-h),(x+7,y-h+14),(x+4,y-4),(x,y)],fill='#9ce8ed');d.line((x,y-h+3,x-3,y-5),fill='#d7f9f3',width=2)
  else:
   d.polygon([(3,68),(9,36),(23,22),(28,8),(38,16),(44,41),(55,55),(60,70)],fill='#201e29');d.polygon([(10,65),(15,40),(26,29),(33,17),(36,50),(51,67)],fill='#51404b');d.line((30,22,25,40,35,48,29,64),fill='#ffb553',width=3);d.line((13,57,22,62),fill='#e16b3a',width=2)
  im.save(out/(prop+'.png'))
 for idx,kind in enumerate(['slime','goblin','wolf','caster','elite','boss']):
  if world=='forest':shutil.copyfile(Path('public/assets/forest')/(kind+'.png'),out/(kind+'.png'));continue
  n=64 if kind=='boss' else 32;sheet=Image.new('RGBA',(n*10,n))
  for f in range(10):
   im=Image.new('RGBA',(n,n));d=ImageDraw.Draw(im);x=n//2;y=n//2+[0,-1,0,1,0,0,2,3,-1,0][f];p=accent
   if 6<=f<=7:d.ellipse((x-12,y+4,x+12,y+9),fill=path)
   elif kind=='boss':
    if world=='desert':
     for yy in range(18,52,8):d.rectangle((16,yy,48,yy+7),fill=['#bb9766','#d0b480'][yy%2]);d.line((17,yy,47,yy),fill='#80664f')
     d.rectangle((21,7,43,24),fill='#cbaa71');d.rectangle((15,4,49,10),fill='#e9cc84');d.rectangle((7,26,14,50),fill='#97704f');d.rectangle((50,26,57,50),fill='#97704f');d.rectangle((25,14,29,16),fill='#ffefb0');d.rectangle((36,14,40,16),fill='#ffefb0')
    elif world=='frozen':
     d.polygon([(32,1),(41,16),(51,21),(44,47),(51,59),(14,59),(21,46),(13,20),(25,14)],fill='#699cb7');d.polygon([(32,4),(38,21),(33,56),(23,44)],fill='#b8f4f0');d.rectangle((24,22,40,29),fill='#1e354a');d.rectangle((26,24,29,25),fill='#e5ffff');d.rectangle((36,24,39,25),fill='#e5ffff');d.line((10,7,8,57),fill='#bee9e7',width=3)
    else:
     d.polygon([(31,13),(8,7),(2,40),(18,32),(18,56),(47,56),(46,32),(61,39),(55,6),(35,13)],fill='#7e3c39');d.polygon([(22,16),(15,1),(27,9),(37,8),(49,0),(42,21)],fill='#e4ab69');d.rectangle((24,18,41,38),fill='#392a37');d.rectangle((25,24,29,26),fill='#ffe88d');d.rectangle((36,24,40,26),fill='#ffe88d');d.polygon([(31,32),(39,44),(32,51),(25,43)],fill='#ffb14d')
   elif idx==0:
    d.ellipse((4,y-5,28,y+11),fill=path);d.polygon([(6,y),(9,y-12),(13,y-3),(20,y-9),(26,y+3)],fill=p);d.rectangle((11,y+2,13,y+4),fill='#202635');d.rectangle((22,y+2,24,y+4),fill='#202635')
   elif world=='desert' and kind=='wolf':
    d.ellipse((8,y-3,25,y+8),fill='#73513f');
    for yy in [0,5,9]:d.line((3,y+yy,29,y+yy-4),fill='#c19258',width=2)
    d.line((9,y,3,y-9,7,y-14,12,y-12),fill=accent,width=3)
   else:
    d.rectangle((10,y+4,13,y+13-f%2*2),fill='#373642');d.rectangle((20,y+4,23,y+11+f%2*2),fill='#373642');d.polygon([(9,y-5),(23,y-5),(26,y+9),(7,y+9)],fill=path);d.rectangle((11,y-12,22,y-4),fill=p);d.rectangle((13,y-8,15,y-7),fill='#182333');d.rectangle((19,y-8,21,y-7),fill='#182333')
    if kind=='caster':d.line((27,y-12,27,y+11),fill='#dec492',width=2);d.ellipse((24,y-14,30,y-8),fill=accent)
    elif kind=='elite':d.rectangle((5,y-4,10,y+7),fill=accent);d.rectangle((23,y-4,28,y+7),fill=accent);d.rectangle((12,y-14,22,y-11),fill='#e6d3ac')
    else:d.line((27,y-5,27,y+12),fill='#ede0b9',width=2)
    if world=='infernal':d.polygon([(9,y-12),(7,y-18),(15,y-12)],fill='#e4b481');d.polygon([(20,y-12),(26,y-18),(24,y-10)],fill='#e4b481')
   if f==5:
    white=Image.new('RGBA',im.size,'#fff0c7');white.putalpha(im.getchannel('A'));im=Image.blend(im,white,.65)
   sheet.paste(im,(f*n,0))
  sheet.save(out/(kind+'.png'))
 # Art preview is assembled from this world's own local terrain and architecture.
 art=Image.new('RGB',(480,270),ground)
 for y in range(0,270,32):
  for x in range(0,480,32):art.paste(tiles.crop((32 if abs(x-240)<45 else 0,0,64 if abs(x-240)<45 else 32,32)),(x,y))
 prop=Image.open(out/'tree.png')
 for i in range(40):
  x=rng.randrange(480);y=rng.randrange(270)
  if 180<x<300:continue
  art.paste(prop,(x-32,y-65),prop)
 boss=Image.open(out/'boss.png').crop((0,0,64,64)).resize((128,128),Image.Resampling.NEAREST);art.paste(boss,(176,75),boss)
 art.resize((960,540),Image.Resampling.NEAREST).save(out/'preview.png')
(root/'LICENSE.md').write_text('Original NowRift procedural artwork, created by scripts/generate-worlds.py. CC0 1.0 Universal. Reference screenshots were not copied.\n')
print('Generated four original world sets: layered terrain, props, animated enemies, bosses and previews.')
