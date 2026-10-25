"""Paired, counterbalanced GPU timings. Headless, muted; no input injection.

The reviewed HTML is read-only. Fixed-shadow and material experiments exist
only inside the instrumented page. Per-run data is journaled before continuing.
"""
import argparse, hashlib, json, pathlib, statistics, subprocess, time
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parent.parent
OUT=ROOT/'evidence'/'performance-followup';OUT.mkdir(exist_ok=True)
p=argparse.ArgumentParser();p.add_argument('--phase',choices=['baseline','attribution','art'],default='baseline');a=p.parse_args()
VIEWS={'world':[[109,125,134],[0,-1,0]],'voice':[[23,19,-23],[0,1,-46]]}
SOURCE={'baseline':'evidence/baseline.html','reviewed':'duderworld-v0-4-1.html','current':'duderworld-v0-5-0.html','legacy-rooms':'evidence/perf-fixtures/candidate-ablation.html?geometry=legacy-rooms'}
if a.phase=='baseline':
    contrasts=[('upstream-reviewed','baseline','reviewed','world','normal',6)]
elif a.phase=='art':
    contrasts=[('art-world','reviewed','current','world','normal',3),('art-voice','reviewed','current','voice','normal',3)]
else:
    contrasts=[('world-shadow','reviewed','reviewed-fixed','world','normal',4),
               ('voice-shadow','reviewed','reviewed-fixed','voice','normal',4),
               ('world-rooms','legacy-rooms','reviewed','world','normal',4),
               ('world-rooms-unshadowed','legacy-rooms','reviewed','world','off',4)]

def hardware():
    try:
        s=subprocess.check_output([r'C:\windows\system32\nvidia-smi.exe','--query-gpu=timestamp,name,clocks.gr,clocks.mem,temperature.gpu,utilization.gpu,power.draw,pstate','--format=csv,noheader'],text=True,creationflags=subprocess.CREATE_NO_WINDOW)
        return s.strip()
    except Exception as e:return str(e)

MEASURE=r'''async()=>{
 const api=__duderworld,r=api.renderer,gl=r.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
 if(!ext)throw Error('No GPU timer query support');
 const raw=[],timedQueries=[],cpu=[],intervals=[],pending=[];let n=0,last=null,invalid=0,info=null;
 const original=r.render.bind(r);r.info.autoReset=false;
 return await new Promise((resolve,reject)=>{
  const deadline=setTimeout(()=>{r.render=original;r.info.autoReset=true;reject(Error('GPU query timeout'));},20000);
  r.render=(s,c)=>{
   const disjoint=gl.getParameter(ext.GPU_DISJOINT_EXT);
   if(disjoint)pending.forEach(p=>p.invalid=true);
   while(pending.length&&gl.getQueryParameter(pending[0].q,gl.QUERY_RESULT_AVAILABLE)){
    const p=pending.shift();if(!p.invalid){const ms=gl.getQueryParameter(p.q,gl.QUERY_RESULT)/1e6;raw.push(ms);timedQueries.push({ms,render:p.info});}else invalid++;
    gl.deleteQuery(p.q);
   }
   const sampling=n>=60&&n<300;let q=null;
   if(sampling){q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);}
   r.info.reset();const t=performance.now();original(s,c);const end=performance.now();
   if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);info={...r.info.render};pending.push({q,info,invalid:disjoint});cpu.push(end-t);if(last!==null)intervals.push(t-last);last=t;}
   n++;
   if(n>=300&&pending.length===0){
    clearTimeout(deadline);r.render=original;r.info.autoReset=true;
    const stats=x=>{const a=[...x].sort((a,b)=>a-b);return {median:a[Math.floor(a.length*.5)],p05:a[Math.floor(a.length*.05)],p95:a[Math.floor(a.length*.95)],samples:a.length};};
    const sun=api.scene.children.find(o=>o.isDirectionalLight);
    resolve({gpu:stats(raw),rawGpuMs:raw,timedQueries,cpu:stats(cpu),interval:stats(intervals),invalid,render:info,
     shadow:{position:sun.position.toArray(),target:sun.target.position.toArray(),projection:sun.shadow.camera.projectionMatrix.toArray(),matrix:sun.shadow.matrix.toArray(),map:sun.shadow.mapSize.toArray()},
     world:api.world().stats});
   }
  };
 });
}'''

result={'phase':a.phase,'viewport':[1600,1000],'dpr':1,'samplesPerRun':240,'warmupFrames':60,
 'headless':True,'muted':True,'animationTimeSeconds':10,'runs':[],
 'reviewedSha256':hashlib.sha256((ROOT/SOURCE['reviewed']).read_bytes()).hexdigest(),
 'currentSha256':hashlib.sha256((ROOT/SOURCE['current']).read_bytes()).hexdigest() if a.phase=='art' else None,
 'notes':'Chronological paired runs with alternating AB/BA order. Per-frame samples are not independent trial replications. No GPU clock or OS settings changed.'}
errors=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--mute-audio','--disable-background-timer-throttling','--disable-renderer-backgrounding'],executable_path=r'C:\Users\trent\AppData\Local\ms-playwright\chromium-1217\chrome-win64\chrome.exe')
 page=browser.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("""Element.prototype.requestPointerLock=function(){throw Error('Pointer lock forbidden')};window.Audio=function(){throw Error('Audio forbidden')};
 const nativeRAF=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>nativeRAF(()=>cb(10000));""")
 for label,left,right,view,shadow,repeats in contrasts:
  for pair in range(repeats):
   for variant in ([left,right] if pair%2==0 else [right,left]):
    source=SOURCE.get(variant,SOURCE['reviewed']);path,_,query=source.partition('?')
    page.goto((ROOT/path).as_uri()+('?' + query if query else ''))
    page.wait_for_function('window.__duderworld && __duderworld.world()')
    page.add_style_tag(content='aside,.footer{display:none!important}')
    page.evaluate('(v)=>__duderworld.view(...v)',VIEWS[view])
    if variant.endswith('-fixed'):
     page.evaluate('''()=>{const r=__duderworld.renderer,orig=r.render.bind(r),sun=__duderworld.scene.children.find(o=>o.isDirectionalLight);r.render=(s,c)=>{Object.assign(sun.shadow.camera,{left:-84,right:84,top:84,bottom:-84});sun.shadow.camera.updateProjectionMatrix();sun.position.set(-41,92,57);sun.target.position.set(0,0,0);orig(s,c);};}''')
    if shadow=='off':
     page.evaluate('''()=>{__duderworld.renderer.shadowMap.enabled=false;__duderworld.scene.traverse(o=>{if(o.material){for(const m of(Array.isArray(o.material)?o.material:[o.material]))m.needsUpdate=true;}});}''')
    measurement=page.evaluate(MEASURE)
    row={'contrast':label,'pair':pair,'variant':variant,'view':view,'shadowMode':shadow,'hardwareAfter':hardware(),**measurement}
    result['runs'].append(row);result['errors']=errors
    (OUT/f'{a.phase}-raw.json').write_text(json.dumps(result,indent=2))
    print(label,pair,variant,round(row['gpu']['median'],6),'ms',row['render']['calls'],'draws',row['hardwareAfter'],flush=True)
 browser.close()
print('Saved',OUT/f'{a.phase}-raw.json',flush=True)
