"""Supplementary sustained throughput, separate from paced interactive timings.
No driver/OS changes, input injection, focus or audio. Fixed scene/animation.
"""
import json,pathlib,subprocess,hashlib
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent;OUT=ROOT/'evidence/terrace'
def hardware():
 return subprocess.check_output([r'C:\windows\system32\nvidia-smi.exe','--query-gpu=timestamp,name,clocks.gr,clocks.mem,temperature.gpu,utilization.gpu,power.draw,pstate','--format=csv,noheader'],text=True,creationflags=subprocess.CREATE_NO_WINDOW).strip()
MEASURE='''async()=>{
 const api=__duderworld,r=api.renderer,gl=r.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
 if(!ext)throw Error('No GPU queries');const render=r.render.bind(r),s=api.scene;let camera;
 await new Promise(resolve=>{r.render=(scene,c)=>{camera=c;resolve();};});
 r.info.autoReset=false;const samples=[],draws=[],invalid=[];
 try{
  for(let i=0;i<160;i++){
   r.info.reset();const q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);
   for(let j=0;j<32;j++)render(s,camera);
   gl.endQuery(ext.TIME_ELAPSED_EXT);gl.finish();
   while(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE))await new Promise(resolve=>setTimeout(resolve,0));
   const disjoint=gl.getParameter(ext.GPU_DISJOINT_EXT);if(disjoint)invalid.push(i);
   else if(i>=40){samples.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6/32);draws.push({...r.info.render});}
   gl.deleteQuery(q);
  }
  const sorted=[...samples].sort((a,b)=>a-b);
  return {gpuMsPerRender:samples,median:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],draws,invalid,world:api.world().stats};
 }finally{r.render=render;r.info.autoReset=true;}
}'''
result={'method':'4 counterbalanced world-view pairs; 40 warmup +120 measured blocks of32 renders, synchronous GPU completion per block; GPU query time divided by32. Supplementary throughput, not interactive FPS or Quest qualification.','viewport':[1600,1000],'runs':[],'errors':[]}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--mute-audio'],executable_path=r'C:\Users\trent\AppData\Local\ms-playwright\chromium-1217\chrome-win64\chrome.exe')
 page=browser.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 page.on('pageerror',lambda e:result['errors'].append(str(e)))
 page.add_init_script("Element.prototype.requestPointerLock=function(){throw Error('Forbidden')};window.Audio=function(){throw Error('Forbidden')};")
 for pair in range(4):
  for variant in (['baseline','candidate'] if pair%2==0 else ['candidate','baseline']):
   path=ROOT/('duderworld-v0-5-0.html' if variant=='baseline' else 'duderworld-v0-5-1.html')
   page.goto(path.as_uri());page.wait_for_function('window.__duderworld');page.evaluate('__duderworld.time(10);__duderworld.view([109,125,134],[0,-1,0])')
   before=hardware();data=page.evaluate(MEASURE);row={'pair':pair,'variant':variant,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'hardwareBefore':before,'hardwareAfter':hardware(),**data}
   result['runs'].append(row);(OUT/'sustained-raw.json').write_text(json.dumps(result,indent=2));print(variant,pair,data['median'],row['hardwareAfter'],flush=True)
 browser.close()
