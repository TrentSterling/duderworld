"""Functional and visual checks by DOM/API in a muted, headless browser.
No keyboard/mouse injection, canvas clicks, focus calls, or audio devices.
"""
import json,pathlib,struct
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
OUT=ROOT/'evidence'/'art';OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=r'C:\Users\trent\AppData\Local\ms-playwright\chromium-1217\chrome-win64\chrome.exe',args=['--mute-audio'])
 page=b.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda message:errors.append(message.text) if message.type=='error' else None)
 page.add_init_script("Element.prototype.requestPointerLock=function(){throw Error('Forbidden QA pointer lock')};window.Audio=function(){throw Error('Forbidden QA audio')};")
 page.goto((ROOT/'duderworld-v0-5-0.html').as_uri());page.wait_for_function('window.__duderworld?.world()')
 page.evaluate('__duderworld.time(2.5)');page.wait_for_timeout(300)
 page.screenshot(path=str(OUT/'after-ui-world.png'))
 for view in ['Voice','Friends','Skate','World']:
  page.evaluate('(v)=>document.querySelector("#focus"+v).click()',view);page.wait_for_timeout(150)
 page.evaluate('document.querySelector("#focusVoice").click()');page.wait_for_timeout(200)
 page.screenshot(path=str(OUT/'after-ui-voice.png'))
 for name in ['view','walk','avatars','outlines']:
  page.evaluate('(id)=>document.getElementById(id).click()',name)
  assert page.evaluate('document.pointerLockElement===null')
  page.evaluate('(id)=>document.getElementById(id).click()',name)
 initial=page.evaluate('__duderworld.world().stats')
 for i in range(3):
  page.evaluate('document.getElementById("reset").click()');page.wait_for_timeout(100)
 assert page.evaluate('__duderworld.world().stats')==initial
 memory=page.evaluate('({...__duderworld.renderer.info.memory})')
 assert memory['geometries']==24,memory
 for key,value in [('islandCount',9),('topology','ring'),('variation',.4),('detail',20),('greenery',.25),('spread',1.1)]:
  page.evaluate('(v)=>{const el=document.getElementById(v[0]);el.value=v[1];el.dispatchEvent(new Event("change"));}',[key,value])
 assert page.evaluate('__duderworld.world().metadata.islands.length')==9
 page.evaluate('document.getElementById("reset").click()')
 files={}
 for action in ['recipe','metadata','bake']:
  with page.expect_download() as wait:
   page.evaluate('(id)=>document.getElementById(id).click()',action)
  download=wait.value;path=OUT/('browser-'+download.suggested_filename);download.save_as(str(path));files[action]=str(path)
 recipe=json.loads(pathlib.Path(files['recipe']).read_text());meta=json.loads(pathlib.Path(files['metadata']).read_text())
 assert recipe['stats']==initial;assert meta==page.evaluate('__duderworld.metadata()')
 assert meta==json.loads((ROOT/'duderworld-v0-5-0.world.json').read_text()),'CLI/browser metadata mismatch'
 assert len(meta['rooms'])==2 and meta['version']==4
 raw=pathlib.Path(files['bake']).read_bytes();magic,version,length=struct.unpack_from('<III',raw)
 assert magic==0x46546c67 and version==2 and length==len(raw)
 gltf=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
 assert len(gltf['meshes'])==18
 triangles=sum(gltf['accessors'][primitive['indices']]['count']//3 for m in gltf['meshes'] for primitive in m['primitives'])
 assert triangles==initial['triangles']
 assert not any('Preview' in n.get('name','') for n in gltf['nodes'])
 page.add_style_tag(content='aside,.footer{display:none!important}')
 page.evaluate('__duderworld.crowd(false);__duderworld.view([0,2.3,-38],[0,2.1,-49])');page.wait_for_timeout(250)
 page.screenshot(path=str(OUT/'junction-shadows.png'))
 page.evaluate('__duderworld.renderer.shadowMap.enabled=false;__duderworld.scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;})');page.wait_for_timeout(250)
 page.screenshot(path=str(OUT/'junction-no-shadows.png'))
 assert not errors,errors
 report={'pass':True,'errors':errors,'noInputInjection':True,'pointerLock':False,'muted':True,
  'checks':['all focus controls','overhead/walk toggles without pointer lock','crowd/outline toggles','three rebuilds without geometry leak','layout controls','recipe JSON download','shared Unity metadata','actual UI GLB download'],
  'rendererMemoryAfterRebuilds':memory,'stats':initial,'exportedGLBTriangles':triangles,'files':files}
 (OUT/'functional-checks.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
 b.close()
