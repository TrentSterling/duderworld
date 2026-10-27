"""Browser acceptance checks. Run under xvfb-run on Linux when ANGLE requires X.
Requires Python Playwright plus Chromium; no browser visits to tront.xyz.
Uses exact built HTML via set_content when sandbox navigation is restricted.
"""
from pathlib import Path
import argparse, json, time, hashlib
from playwright.sync_api import sync_playwright
from PIL import Image, ImageStat
ap=argparse.ArgumentParser();ap.add_argument('--chromium',default='/usr/bin/chromium');ap.add_argument('--out',default='output/coast');ap.add_argument('--roundtrip-script');args=ap.parse_args()
root=Path(__file__).resolve().parents[1];out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
html=root/'duderworld-coast-v0-5.html';text=html.read_text()
errors=[];warnings=[];requests=[];report={'htmlSHA256':hashlib.sha256(html.read_bytes()).hexdigest(),'execution':'Chromium ANGLE SwiftShader, exact HTML via set_content; not a hardware FPS benchmark','captures':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=args.chromium,headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1,accept_downloads=True)
 def settle():
  before=page.evaluate('DuderWorld.getReport().frames')
  page.evaluate('DuderWorld.requestRender()')
  page.wait_for_function('(n)=>DuderWorld.getReport().frames>n',arg=before)
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else warnings.append(m.text) if m.type=='warning' else None)
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 page.set_content(text,wait_until='load');page.wait_for_function("document.body.dataset.ready === 'true'",timeout=20000)
 page.wait_for_function('DuderWorld.getReport().frames>0')
 page.screenshot(path=str(out/'overview-ui.png'))
 page.click('#hide')
 for view in ['all','hub','skate','beach']:
  before=page.evaluate('DuderWorld.getReport().frames');page.evaluate('(v)=>DuderWorld.setPreset(v)',view)
  page.wait_for_function('(n)=>DuderWorld.getReport().frames>n',arg=before)
  path=out/(view+'.png');page.screenshot(path=str(path))
  im=Image.open(path).convert('RGB');ext=ImageStat.Stat(im)
  assert max(ext.stddev)>15, f'Blank render: {view}'
  report['captures'].append({'view':view,'nonblank':True,'rgbStddev':ext.stddev})
 page.keyboard.press('h');page.click('[data-view="hub"]');assert page.evaluate('DuderWorld.getReport().preset')=='hub'
 page.click('#wire');assert page.evaluate('DuderWorld.materials.matte.wireframe')
 page.click('#wire');page.click('#figures');assert not page.evaluate('DuderWorld.world.crowd.visible')
 settle();settle()
 report['sceneryOnly']=page.evaluate('DuderWorld.getReport()')
 page.click('#figures');page.keyboard.press('1');settle();settle()
 report['withFigures']=page.evaluate('DuderWorld.getReport()')
 with page.expect_download(timeout=30000) as dl:page.click('#export')
 dl.value.save_as(str(out/'duderworld-coast-v0-5.glb'))
 with page.expect_download() as dl:page.click('#metadata')
 dl.value.save_as(str(out/'duderworld-coast-v0-5.json'))
 with page.expect_download() as dl:page.click('#atlas')
 dl.value.save_as(str(out/'duderworld-palette-128.png'))
 report['viewerWarnings']=list(warnings)
 if args.roundtrip_script:
  page.add_script_tag(content=Path(args.roundtrip_script).read_text())
  report['roundtrip']=page.evaluate('verifyCoastRoundTrip()')
  assert report['roundtrip']['pass'] and report['roundtrip']['indicesAndAttributesPreserved']
  page.evaluate("DuderWorld.world.root.visible=false;DuderWorld.world.crowd.visible=false;DuderWorld.scene.add(__roundTrippedCoast);DuderWorld.renderer.shadowMap.needsUpdate=true;DuderWorld.requestRender();document.body.classList.add('clean')")
  settle();page.screenshot(path=str(out/'glb-roundtrip.png'))
  page.evaluate('DuderWorld.scene.remove(__roundTrippedCoast);DuderWorld.world.root.visible=true;DuderWorld.world.crowd.visible=true;DuderWorld.requestRender()')
 page.set_viewport_size({'width':390,'height':844});settle();page.screenshot(path=str(out/'mobile.png'))
 report.update({'errors':errors,'warnings':warnings,'runtimeRequests':requests,'controlsPassed':True,'exportBytes':(out/'duderworld-coast-v0-5.glb').stat().st_size,'pass':not errors})
 (out/'browser-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
 b.close()
 assert not errors
 assert not [r for r in requests if r.startswith(('http:','https:'))], 'External runtime dependency'
