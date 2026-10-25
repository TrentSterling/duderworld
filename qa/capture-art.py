"""Actual new and checkpoint renders, no synthesized preview imagery."""
import pathlib,json
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent;OUT=ROOT/'evidence'/'art';OUT.mkdir(exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--mute-audio'],executable_path=r'C:\Users\trent\AppData\Local\ms-playwright\chromium-1217\chrome-win64\chrome.exe')
 page=browser.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("Element.prototype.requestPointerLock=function(){throw Error('Forbidden')};window.Audio=function(){throw Error('Forbidden')};")
 for variant in ['before','after']:
  page.goto((OUT/'botanical-lab.html').as_uri()+'?variant='+variant);page.wait_for_function('window.__botanical');page.wait_for_timeout(300)
  page.screenshot(path=str(OUT/f'botanical-{variant}.png'))
  print('Botanical',variant,page.evaluate('__botanical.stats'),flush=True)
  if variant=='after':
   page.evaluate('__botanical.renderer.shadowMap.enabled=false;__botanical.scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});__botanical.renderer.render(__botanical.scene,__botanical.camera)')
   page.screenshot(path=str(OUT/'botanical-no-shadows.png'))
 for label,file in [('checkpoint','duderworld-v0-4-1.html'),('hero','duderworld-v0-5-0.html')]:
  page.goto((ROOT/file).as_uri());page.wait_for_function('window.__duderworld');page.add_style_tag(content='aside,.footer{display:none!important}')
  page.evaluate('__duderworld.crowd(false)')
  for name,pos,target in [('room',[14,11,-25],[0,1.5,-46]),('interior',[3,3.1,-38],[-2,2,-51]),('friends',[-23,12,-10],[-43,1.5,-26])]:
   page.evaluate('(v)=>__duderworld.view(...v)',[pos,target]);page.wait_for_timeout(400);page.screenshot(path=str(OUT/f'{label}-{name}.png'))
 print('Errors',errors,flush=True);(OUT/'capture-errors.json').write_text(json.dumps(errors))
 browser.close()
