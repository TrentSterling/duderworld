"""Muted headless renderer inspection. Never sends mouse/keyboard input."""
import argparse, json, pathlib, statistics, time
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('html');p.add_argument('label');p.add_argument('--video',action='store_true');a=p.parse_args()
out=ROOT/'evidence';out.mkdir(exist_ok=True)
views={
 'world':([109,125,134],[0,-1,0]),
 'voice':([23,19,-23],[0,1,-46]),
 'friends':([-20,19,-5],[-43,1,-26]),
 'inside':([0,2.3,-38],[0,2.1,-49]),
 'skate':([34,27,34],[0,0,0]),
}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--mute-audio','--disable-background-timer-throttling','--disable-renderer-backgrounding'],executable_path=r'C:\Users\trent\AppData\Local\ms-playwright\chromium-1217\chrome-win64\chrome.exe')
 page=browser.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 errors=[]
 def error(e): errors.append(str(e));print('PAGE ERROR:',str(e),flush=True)
 page.on('pageerror',error)
 page.add_init_script("Element.prototype.requestPointerLock=function(){throw Error('Pointer lock forbidden in QA')}; window.Audio=function(){throw Error('Audio forbidden in QA')};")
 page.goto((ROOT/a.html).resolve().as_uri());print('Loaded',a.html,flush=True)
 page.wait_for_function('window.__duderworld && window.__duderworld.world()')
 page.add_style_tag(content='aside,.footer{display:none!important}')
 result={'label':a.label,'viewport':[1600,1000],'headless':True,'muted':True,'errors':errors,'views':{}}
 result['world']=page.evaluate('window.__duderworld.world().stats')
 result['gpu']=page.evaluate('''()=>{const gl=__duderworld.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:e?gl.getParameter(e.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR)};}''')
 for name,(pos,target) in views.items():
  page.evaluate('(v)=>__duderworld.view(...v)',[pos,target]);page.wait_for_timeout(600)
  page.screenshot(path=str(out/f'{a.label}-{name}.png'))
  result['views'][name]=page.evaluate('''async()=>{
   const r=__duderworld.renderer,gl=r.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
   const cpu=[],intervals=[],gpu=[],pending=[];let last=performance.now(),count=0,info;
   const original=r.render.bind(r);r.info.autoReset=false;return await new Promise(resolve=>{
    r.render=(s,c)=>{let q=null;if(ext){q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);}
     r.info.reset();const t=performance.now();original(s,c);const end=performance.now();if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(q);}
     if(count++>20){cpu.push(end-t);intervals.push(t-last);}last=t;info={...r.info.render};
     while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){
       const v=gl.getQueryParameter(pending[0],gl.QUERY_RESULT);if(!gl.getParameter(ext.GPU_DISJOINT_EXT))gpu.push(v/1e6);gl.deleteQuery(pending.shift());}
     if(count>=141){r.render=original;r.info.autoReset=true;pending.forEach(q=>gl.deleteQuery(q));
       const stats=x=>{x.sort((a,b)=>a-b);return {median:x[Math.floor(x.length*.5)]??null,p95:x[Math.floor(x.length*.95)]??null,samples:x.length}};
       resolve({render:info,cpuSubmissionMs:stats(cpu),frameIntervalMs:stats(intervals),gpuMs:stats(gpu),memory:r.info.memory});}
    };
   });}''')
  print(name,json.dumps(result['views'][name]),flush=True)
 if a.video:
  frames=out/f'{a.label}-film';frames.mkdir(exist_ok=True)
  import math
  for i in range(180):
   t=i/180*math.pi*1.4
   page.evaluate('(v)=>__duderworld.view(...v)',[[math.sin(t)*25,12+math.sin(t*.5)*6,-46+math.cos(t)*25],[0,1.7,-46]])
   page.evaluate('(t)=>__duderworld.time(t)',i/30)
   page.screenshot(path=str(frames/f'{i:04d}.png'))
 result['errors']=errors
 (out/f'{a.label}-metrics.json').write_text(json.dumps(result,indent=2))
 browser.close()
