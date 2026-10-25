from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent;out=ROOT/'evidence/terrace'
font='C:/Windows/Fonts/segoeui.ttf'
title=ImageFont.truetype(font,36);label=ImageFont.truetype(font,24);small=ImageFont.truetype(font,20)
def sheet(name,heading,subtitle,rows):
 im=Image.new('RGB',(1680,150+len(rows)*535),'#f0e9da');d=ImageDraw.Draw(im)
 d.text((32,24),heading,font=title,fill='#304f4e');d.text((32,80),subtitle,font=small,fill='#526563')
 for i,(a,b,caption) in enumerate(rows):
  y=122+i*535;d.text((32,y),caption,font=label,fill='#304f4e')
  for j,f in enumerate([a,b]):
   x=32+j*824;pic=Image.open(out/f).convert('RGB');pic.thumbnail((792,495));im.paste(pic,(x,y+40))
   d.rectangle((x+10,y+50,x+210,y+85),fill='#304f4e');d.text((x+20,y+52),'0.5.0 BASELINE' if j==0 else '0.5.1 CANDIDATE',font=small,fill='#fff5df')
 im.save(out/name);im.save(ROOT/'docs/media'/name)
sheet('duderworld-0.5.1-arrivals.png','DUDERWORLD / ARRIVALS & SEA TERRACES',
 'Actual matched renders. Existing islands and rooms. 331,072 triangles / 18 batches / no postprocessing.',[
 ('baseline-arrival.png','final-arrival.png','Arrival: continuous rolled portal, room badge and a flush threshold'),
 ('baseline-terrace.png','final-terrace.png','Sea opening: a clear view, paired seats and an integrated lookout ledge'),
 ('baseline-sea-view.png','final-sea-view.png','From the room: a calm terrace composition and a verified 2 m walking route')])
sheet('duderworld-0.5.1-budget.png','DUDERWORLD / GEOMETRY BUDGET',
 '14.1% fewer triangles including new architecture. Hero foliage and cushion tessellation retained.',[
 ('baseline-plants-close.png','reduced-plants-close.png','Close: leaf outlines and hero plants retained; the smaller rosette has a shallower cup'),
 ('baseline-plants-medium.png','reduced-plants-medium.png','Medium distance: same authored leaf count, stems, pots and outer leaf stations'),
 ('baseline-trim.png','final-trim.png','Close trim: fewer samples on bevels up to 5 cm; minor highlight changes remain'),
 ('baseline-interior.png','final-interior.png','Room furniture: the large cushions, pillows and wall curves keep their sampling')])
print('Saved both matched comparison sheets')
