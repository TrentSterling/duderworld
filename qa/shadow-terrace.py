"""Bounded shadow setting comparison; renderer-only changes, no input/audio."""
import pathlib,json
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent;OUT=ROOT/'evidence/terrace/shadows';OUT.mkdir(exist_ok=True)
variants=[('current',-.0004,.07,None),('low-bias',-.00015,.025,None),('front',-.00015,.025,0),('front-small',-.00008,.012,0),('off',0,0,None)]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--mute-audio'],executable_path=r'C:\Users\trent\AppData\Local\ms-playwright\chromium-1217\chrome-win64\chrome.exe')
 page=browser.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 page.add_init_script("Element.prototype.requestPointerLock=function(){throw Error('Forbidden')};window.Audio=function(){throw Error('Forbidden')};")
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 for scene,file in [('room','duderworld-v0-5-1.html'),('plant','evidence/terrace/botanical-reduced.html')]:
  for name,bias,normal,side in variants:
   page.goto((ROOT/file).as_uri());page.wait_for_function('window.__duderworld||window.__botanical')
   if scene=='room':
    page.add_style_tag(content='aside,.footer{display:none!important}');page.evaluate('__duderworld.crowd(false);__duderworld.view([3,3.1,-38],[-2,2,-51])')
   page.evaluate('''([name,bias,normal,side])=>{const api=window.__duderworld||window.__botanical,sun=api.scene.children.find(o=>o.isDirectionalLight);sun.shadow.bias=bias;sun.shadow.normalBias=normal;api.renderer.shadowMap.enabled=name!=='off';api.scene.traverse(o=>{if(o.material){o.material.shadowSide=side;o.material.needsUpdate=true}});if(window.__botanical)api.renderer.render(api.scene,api.camera)}''',[name,bias,normal,side])
   page.wait_for_timeout(200);page.screenshot(path=str(OUT/f'{scene}-{name}.png'))
 (OUT/'errors.json').write_text(json.dumps(errors));assert not errors;browser.close()
