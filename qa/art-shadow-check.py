import pathlib
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent;OUT=ROOT/'evidence'/'art'
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,args=['--mute-audio'],executable_path=r'C:\Users\trent\AppData\Local\ms-playwright\chromium-1217\chrome-win64\chrome.exe')
 page=b.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 page.add_init_script("Element.prototype.requestPointerLock=()=>{throw Error('Forbidden')};window.Audio=()=>{throw Error('Forbidden')};")
 for name,bias,normal,kind in [('normal',-.00022,.035,2),('offset',-.0004,.07,2),('pcf',-.0004,.07,1),('front',-.00015,.04,1)]:
  page.goto((ROOT/'duderworld-v0-5-0.html').as_uri());page.wait_for_function('window.__duderworld');page.add_style_tag(content='aside,.footer{display:none!important}')
  page.evaluate('__duderworld.crowd(false);__duderworld.view([3,3.1,-38],[-2,2,-51])')
  page.evaluate('''(args)=>{const [bias,normal,kind,name]=args,r=__duderworld.renderer;const sun=__duderworld.scene.children.find(o=>o.isDirectionalLight);sun.shadow.bias=bias;sun.shadow.normalBias=normal;r.shadowMap.type=kind;__duderworld.scene.traverse(o=>{if(o.material){o.material.needsUpdate=true;if(name==='front')o.material.shadowSide=0;}});}''',[bias,normal,kind,name])
  page.wait_for_timeout(500);page.screenshot(path=str(OUT/f'shadow-{name}.png'))
 b.close()
