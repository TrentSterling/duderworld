"""Matched offscreen comparisons. No physical input, focus, pointer lock or sound."""
import argparse,json,pathlib
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent;OUT=ROOT/'evidence/terrace';OUT.mkdir(exist_ok=True)
p=argparse.ArgumentParser();p.add_argument('--phase',default='reduced');a=p.parse_args()
worlds=[('baseline',ROOT/'duderworld-v0-5-0.html'),(a.phase,ROOT/('evidence/terrace/reduced-only.html' if a.phase=='reduced' else 'duderworld-v0-5-1.html'))]
views={
 'room':([14,11,-25],[0,1.5,-46]),
 'interior':([3,3.1,-38],[-2,2,-51]),
 'arrival':([6,4.7,-25],[0,2,-39]),
 'terrace':([20,7,-66],[6.4,1.2,-53.3]),
 'terrace-close':([12.4,3.2,-60],[7.0,.9,-52.7]),
 'sea-view':([3.1,2.8,-50],[10.8,1.0,-55.3]),
 'friends':([-23,12,-10],[-43,1.5,-26]),
 'trim':([48.7,2,27],[51.8,1.6,28]),
}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--mute-audio'],executable_path=r'C:\Users\trent\AppData\Local\ms-playwright\chromium-1217\chrome-win64\chrome.exe')
 page=browser.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.add_init_script("Element.prototype.requestPointerLock=function(){throw Error('Forbidden')};window.Audio=function(){throw Error('Forbidden')};")
 for label,filename in worlds:
  page.goto(filename.as_uri());page.wait_for_function('window.__duderworld');page.add_style_tag(content='aside,.footer{display:none!important}')
  page.evaluate('__duderworld.crowd(false);__duderworld.time(10)')
  for name,view in views.items():
   page.evaluate('(v)=>__duderworld.view(...v)',view);page.wait_for_timeout(180)
   page.screenshot(path=str(OUT/f'{label}-{name}.png'))
  print(label,page.evaluate('__duderworld.world().stats'),flush=True)
 if a.phase=='reduced':
  for label in ['baseline','reduced']:
   page.goto((OUT/f'botanical-{label}.html').as_uri());page.wait_for_function('window.__botanical')
   for distance,pos in [('close',[4.1,3.7,8.2]),('medium',[8.2,5.3,16.4])]:
    page.evaluate('(p)=>{const a=__botanical;a.camera.position.set(...p);a.camera.lookAt(0,1.05,0);a.renderer.render(a.scene,a.camera)}',pos)
    page.screenshot(path=str(OUT/f'{label}-plants-{distance}.png'))
 print('Errors',errors,flush=True);(OUT/f'{a.phase}-capture-errors.json').write_text(json.dumps(errors));assert not errors
 browser.close()
