from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent;out=ROOT/'evidence'/'art'
fontPath='C:/Windows/Fonts/segoeui.ttf'
title=ImageFont.truetype(fontPath,38);label=ImageFont.truetype(fontPath,24);small=ImageFont.truetype(fontPath,20)
sheet=Image.new('RGB',(1680,1770),'#f0e9da');d=ImageDraw.Draw(sheet)
d.text((32,24),'DUDERWORLD 0.5.0 / GARDEN LOUNGES',font=title,fill='#304f4e')
d.text((32,82),'Actual renderer captures. Modeled foliage, closed cushion assemblies and single-pass NPR. 18 static batches.',font=small,fill='#526563')
rows=[('botanical-before.png','botanical-after.png','Plant geometry: old clumps to curved blades, petioles and turned ceramics'),
 ('checkpoint-interior.png','hero-interior.png','Voice lounge: upholstery assemblies, calm floor, ceramic shell and designed shading'),
 ('checkpoint-room.png','hero-room.png','Connected island architecture retained; no postprocessing chain')]
for i,(a,b,caption) in enumerate(rows):
 y=128+i*535;d.text((32,y),caption,font=label,fill='#304f4e')
 for j,name in enumerate([a,b]):
  x=32+j*824;im=Image.open(out/name).convert('RGB');im.thumbnail((792,495));sheet.paste(im,(x,y+40))
  d.rectangle((x+10,y+50,x+210,y+85),fill='#304f4e');d.text((x+20,y+52),'CHECKPOINT 0.4.1' if j==0 else 'NPR ART PASS',font=small,fill='#fff5df')
sheet.save(out/'duderworld-npr-art-checkpoint.png')
print(out/'duderworld-npr-art-checkpoint.png')
