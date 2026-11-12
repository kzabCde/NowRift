"""Original CC0 NowRift pixel effects. All pixels are authored here; no reference-sheet pixels.
Run after generate-assets.py and generate-worlds.py. Pillow is only a build-art tool.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import math
import random

FAMILIES = ('fire', 'frost', 'lightning', 'physical', 'nature', 'arcane', 'impact')
PALETTES = {
 'fire': ('#512b3b', '#a43e31', '#e86d32', '#ffbf58', '#fff0af'),
 'frost': ('#253d62', '#447eae', '#75bcd7', '#a3e6ef', '#efffff'),
 'lightning': ('#30345f', '#6563b0', '#9da1ee', '#c8eaff', '#ffffff'),
 'physical': ('#354559', '#718295', '#b0c3ce', '#e2e7d8', '#fff7d7'),
 'nature': ('#254b42', '#41875b', '#8ab56b', '#c4da8c', '#f5f0b6'),
 'arcane': ('#303b61', '#527597', '#78b9d0', '#b5eadf', '#fff3cc'),
 'impact': ('#435261', '#7d8b91', '#bbc6bb', '#e4e9ce', '#fffbea'),
}
def point(angle, radius, center=(24, 24)):
 return round(center[0] + math.cos(angle) * radius), round(center[1] + math.sin(angle) * radius)
def spark(d, x, y, color, radius=3):
 d.line((x-radius,y,x+radius,y),fill=color);d.line((x,y-radius,x,y+radius),fill=color)
 d.rectangle((x-1,y-1,x+1,y+1),fill=color)
def cell(family, row, frame):
 im=Image.new('RGBA',(48,48));d=ImageDraw.Draw(im);p=PALETTES[family];t=frame/7
 rng=random.Random(277+FAMILIES.index(family)*101+row*37+frame)
 r=6+frame*2
 if family=='fire':
  if row==0:
   for ring in range(3):
    radius=max(3,r-ring*4);poly=[]
    for j in range(20):poly.append(point(j*math.pi/10,radius+(3 if j%2 else 0)))
    d.polygon(poly,fill=p[ring+1])
   for j in range(8):
    x,y=point(j*math.pi/4+frame*.16,r+4);d.rectangle((x-1,y-2,x+1,y+1),fill=p[3])
   d.ellipse((19,18,29,28),fill=p[4])
  else:
   for j,x in enumerate([12,20,28,36]):
    y=36-round(t*12)-j%2*4;h=12+(frame+j*3)%9
    d.polygon([(x-5,y),(x-6,y-7),(x-1,y-h),(x+1,y-h-5),(x+3,y-10),(x+6,y-5),(x+5,y)],fill=p[1])
    d.polygon([(x-3,y-1),(x-3,y-6),(x+1,y-h+1),(x+2,y-7),(x+4,y-3)],fill=p[2])
    d.polygon([(x-1,y-2),(x,y-8),(x+2,y-4),(x+2,y-1)],fill=p[4])
   for j in range(4):d.point((9+j*9,8+(frame*3+j*7)%18),fill=p[3])
 elif family=='frost':
  if row==0:
   poly=[point(j*math.pi/12,r+(2 if j%2 else 0)) for j in range(24)]
   d.line(poly+[poly[0]],fill=p[1],width=3);d.line(poly+[poly[0]],fill=p[3],width=1)
   for j in range(6):
    a=j*math.pi/3;x,y=point(a,r+2);d.polygon([point(a-.12,r-2),point(a,r+6),point(a+.12,r-2)],fill=p[3]);spark(d,x,y,p[4],2)
  else:
   for j in range(6):
    a=j*math.pi/3+frame*.08;x,y=point(a,6+frame*2)
    d.polygon([(x,y-8),(x+4,y-1),(x+1,y+6),(x-4,y+1)],fill=p[1]);d.polygon([(x,y-6),(x+2,y),(x,y+4),(x-2,y)],fill=p[3]);d.line((x,y-5,x,y+2),fill=p[4])
   spark(d,24,24,p[4],max(1,6-frame))
 elif family=='lightning':
  if row==0:
   poly=[(2,24),(9,19+frame%3),(15,27),(21,15+frame%3),(27,30),(32,20),(38,26),(46,23)]
   d.line(poly,fill=p[1],width=7);d.line(poly,fill=p[3],width=3);d.line(poly,fill=p[4],width=1)
   spark(d,10,21,p[3],3);spark(d,39,24,p[4],3)
  else:
   for j in range(8):
    a=j*math.pi/4+frame*.12;poly=[point(a,5),point(a-.08,r),point(a+.12,r+5),point(a,r+8)]
    d.line(poly,fill=p[2],width=3);d.line(poly,fill=p[4],width=1)
   d.ellipse((19,19,29,29),fill=p[2]);d.ellipse((22,22,26,26),fill=p[4])
 elif family=='physical':
  if row==0:
   start=-1.2+frame*.07;outer=[point(start+j*.15,18) for j in range(16)];inner=[point(start+j*.15,11+int(t*4)) for j in range(15,-1,-1)]
   d.polygon(outer+inner,fill=p[1]);d.line(outer,fill=p[3],width=2)
   d.line([point(start+j*.15,16) for j in range(16)],fill=p[4],width=1)
   for j in range(3):
    x,y=point(start+j*.7,20);d.line((x-2,y+3,x+1,y-2),fill=p[2])
  else:
   d.ellipse((24-r,24-r//2,24+r,24+r//2),outline=p[2],width=2)
   for j in range(8):
    a=j*math.pi/4;x,y=point(a,r);d.polygon([(x-3,y-2),(x+1,y-4),(x+3,y),(x,y+2)],fill=p[1]);d.line((x-2,y-2,x+1,y-3),fill=p[3])
 elif family=='nature':
  if row==0:
   poly=[point(j*.3+frame*.18,4+j*.6) for j in range(35)]
   d.line(poly,fill=p[1],width=2)
   for j in range(7):
    a=j*math.pi/3.5+frame*.14;x,y=point(a,r)
    d.polygon([(x-4,y+2),(x-2,y-3),(x+4,y-3),(x+2,y+2)],fill=p[2]);d.line((x-2,y+1,x+2,y-2),fill=p[4])
  else:
   for j,x in enumerate([12,24,35]):
    y=33-round(t*16)+(j%2)*7
    d.line((x-4,y,x+4,y),fill=p[0],width=5);d.line((x,y-4,x,y+4),fill=p[0],width=5)
    d.line((x-3,y,x+3,y),fill=p[3],width=3);d.line((x,y-3,x,y+3),fill=p[3],width=3);d.point((x-1,y-2),fill=p[4])
   for j in range(5):
    x,y=point(j*math.pi/2.5,r);d.rectangle((x,y,x+1,y+1),fill=p[2])
 elif family=='arcane':
  if row==0:
   d.ellipse((4,13,44,35),outline=p[1],width=2);d.ellipse((7,15,41,33),outline=p[3],width=1)
   for j in range(8):
    a=j*math.pi/4+frame*.1;x,y=point(a,16);y=24+round((y-24)*.55)
    d.rectangle((x-1,y-3,x+1,y+3),fill=p[2]);d.line((x-2,y-2,x+2,y-2),fill=p[4]);d.point((x+2,y+2),fill=p[3])
   spark(d,24,24,p[4],2+frame%3)
  else:
   for j in range(8):
    a=j*math.pi/4;d.line([point(a,3),point(a,r),point(a+.08,r+3)],fill=p[2],width=2)
   d.polygon([(24,9),(28,20),(39,24),(28,28),(24,39),(20,28),(9,24),(20,20)],fill=p[1])
   d.polygon([(24,15),(27,22),(33,24),(26,27),(24,33),(21,26),(15,24),(22,21)],fill=p[3]);spark(d,24,24,p[4],4)
 else:
  if row==0:
   for j in range(6):
    a=j*math.pi/3+frame*.07;d.line([point(a,2),point(a,r)],fill=p[2],width=2)
   d.polygon([(24,14),(27,21),(35,24),(27,27),(24,34),(21,27),(14,24),(21,21)],fill=p[3]);spark(d,24,24,p[4],4)
  else:
   for j in range(6):
    x,y=point(j*math.pi/3,r*.55,(24,29-round(t*8)));radius=3+(j+frame)%3
    d.ellipse((x-radius,y-radius,x+radius,y+radius),fill=p[0]);d.arc((x-radius,y-radius,x+radius,y+radius),180,300,fill=p[2])
 for j in range(3):
  x,y=rng.randrange(8,40),rng.randrange(8,40)
  if frame<6:d.point((x,y),fill=p[2])
 if frame>4:im.putalpha(im.getchannel('A').point(lambda a:round(a*(1-(frame-4)*.2))))
 return im

def projectile(frame, world='forest'):
 im=Image.new('RGBA',(16,16));d=ImageDraw.Draw(im)
 if frame==0:
  d.line((2,14,11,5),fill='#3b587c',width=5);d.line((4,12,12,4),fill='#72b3cf',width=3)
  d.polygon([(13,1),(15,4),(12,8),(8,7),(9,3)],fill='#a5dfeb');d.line((11,5,13,3),fill='#f0ffef',width=2);d.point((3,10),fill='#b9ebde')
 elif frame==1:
  d.polygon([(14,1),(14,5),(7,12),(4,9),(10,3)],fill='#39485d');d.polygon([(13,2),(12,6),(7,10),(6,9)],fill='#dfdfc6')
  d.line((3,8,8,13),fill='#c6a366',width=2);d.line((1,14,5,10),fill='#71513d',width=2);d.point((10,5),fill='#fff8df')
 elif frame==2:
  d.polygon([(0,15),(3,8),(3,3),(7,5),(11,0),(15,4),(14,10),(8,13)],fill='#903c31')
  d.polygon([(3,12),(5,8),(7,9),(11,2),(14,5),(12,10),(8,12)],fill='#f18a37');d.polygon([(8,9),(10,4),(13,4),(13,7),(10,10)],fill='#ffe6a0');d.point((1,10),fill='#e49e47')
 elif frame==3:
  d.polygon([(14,0),(15,6),(8,14),(5,10),(1,11),(5,4)],fill='#366b8f');d.polygon([(13,2),(13,7),(7,12),(8,6)],fill='#a1dce8');d.line((7,9,13,3),fill='#edffff');d.line((2,14,4,12),fill='#6ca5bd')
 elif world=='desert':
  d.line((1,14,12,3),fill='#5e423b',width=3);d.line((2,13,12,3),fill='#e2bd72');d.polygon([(14,0),(14,6),(9,2)],fill='#f1dfb0');d.line((1,9,5,13),fill='#b77b48',width=2)
 elif world=='frozen':
  for a in range(0,360,60):
   angle=math.radians(a);d.line((8,8,round(8+math.cos(angle)*7),round(8+math.sin(angle)*7)),fill='#73b5dd',width=3)
  d.polygon([(8,1),(12,5),(11,11),(7,15),(3,10),(4,4)],fill='#a0dfea');d.polygon([(8,3),(10,7),(7,12),(6,7)],fill='#efffff')
 elif world=='infernal':
  d.polygon([(1,14),(3,7),(3,2),(8,5),(11,0),(15,6),(14,12),(8,15)],fill='#7f3b50');d.polygon([(5,12),(6,6),(10,3),(13,7),(11,12)],fill='#f3a354');d.rectangle((8,7,10,10),fill='#ffebaf')
 else:
  d.polygon([(1,15),(3,9),(7,7),(7,3),(11,5),(15,0),(13,8),(9,11),(7,15)],fill='#416e54');d.line((3,13,13,3),fill='#c0d28b',width=2);d.polygon([(6,6),(8,4),(9,9),(5,10)],fill='#79a96b')
 return im

def generate():
 out=Path('public/assets/pixel/skills');out.mkdir(parents=True,exist_ok=True)
 for family in FAMILIES:
  sheet=Image.new('RGBA',(384,96))
  for row in range(2):
   for frame in range(8):sheet.alpha_composite(cell(family,row,frame),(frame*48,row*48))
  sheet.save(out/(family+'.png'))
 (out/'LICENSE.md').write_text('SPDX-License-Identifier: CC0-1.0\n\nOriginal NowRift procedural pixel effects, authored by scripts/generate-effects.py. No third-party pixels.\nhttps://creativecommons.org/publicdomain/zero/1.0/\n')
 for world in ['forest','desert','frozen','infernal']:
  atlas=Image.new('RGBA',(80,16))
  for frame in range(5):atlas.alpha_composite(projectile(frame,world),(frame*16,0))
  path=Path('public/assets/worlds')/world/'projectiles.png';path.parent.mkdir(parents=True,exist_ok=True);atlas.save(path)
  if world=='forest':atlas.save('public/assets/forest/projectiles.png')
 print('Generated seven original 16-frame pixel VFX sheets and five distinct projectile atlases.')

if __name__=='__main__':generate()
