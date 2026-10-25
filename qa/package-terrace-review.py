"""Small source snapshot and evidence package, after the local review commit."""
import hashlib,json,pathlib,subprocess,zipfile
ROOT=pathlib.Path(__file__).resolve().parent.parent
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
branch=subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()
assert not subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip(),'Commit reviewed sources before packaging'
tracked=subprocess.check_output(['git','ls-tree','-r','--name-only',commit],cwd=ROOT,text=True).splitlines()
names=[]
for n in tracked:
 if n.endswith('.glb') and n not in ['duderworld-archipelago-v0-5-1.glb','duderworld-lobby-v0-2.glb']:continue
 if n.endswith('.png') and 'duderworld-0.5.1-' not in n:continue
 if n.endswith('.html') and n.startswith('duderworld-') and n not in ['duderworld-v0-5-1.html','duderworld-v0-5-0.html']:continue
 names.append(n)
extras=['evidence/terrace/'+n for n in ['final-arrival.png','final-terrace.png','final-sea-view.png',
 'functional-checks.json','export-parity.json','final-tests.txt','video-receipt.json',
 'profile-checkpoint.json','profile-art-baseline.json','profile-final.json','sustained-raw.json']]
extras+=['evidence/performance-followup/terrace-raw.json','evidence/terrace-final-metrics.json']
receipt={'repository':'TrentSterling/duderworld','baseline':'644136e0d193dfd781c4c4aca81ecbe1aad7211e','branch':branch,'commit':commit,'version':'0.5.1','remoteWrites':False,'htmlSha256':hashlib.sha256((ROOT/'duderworld-v0-5-1.html').read_bytes()).hexdigest()}
(ROOT/'evidence/terrace/source-receipt.json').write_text(json.dumps(receipt,indent=2));extras.append('evidence/terrace/source-receipt.json')
report='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>DuderWorld 0.5.1 review</title>
<style>body{margin:0;background:#eee4d1;color:#2a4947;font:16px/1.55 system-ui}main{max-width:1150px;margin:auto;padding:36px 24px}h1{font-size:48px;line-height:1.06;letter-spacing:-2px}a{color:#526b68}img{width:100%;border-radius:16px}small{color:#637472}.cards{display:grid;grid-template-columns:1fr 1fr;gap:20px}.card{padding:20px;background:#faf4e7;border-radius:18px}@media(max-width:750px){.cards{grid-template-columns:1fr}}</style><main>
<small>TRONT / DUDERWORLD / LOCAL REVIEW CANDIDATE</small><h1>Arrive. Sit. Look out.</h1>
<p><a href="duderworld-v0-5-1.html">Open the offline world</a> &nbsp; <a href="duderworld-archipelago-v0-5-1.glb">Unity GLB</a> &nbsp; <a href="duderworld-v0-5-0.html">Preserved 0.5.0 baseline</a></p>
<img src="docs/media/duderworld-0.5.1-arrivals.png" alt="Matched baseline and candidate arrival, terrace and sea-view renders">
<div class="cards"><div class="card"><h2>Composed existing rooms</h2><p>Continuous open arrival portals, flush thresholds, leaned terrace seating, side tables and a lookout ledge. The obstructing palm now frames the sea opening. No new islands.</p></div><div class="card"><h2>14.1% fewer triangles</h2><p>331,072 static triangles, 258,984 vertices, 18 batches. Small trim and nonhero leaf interiors use fewer samples; hero foliage, stems, pots and large upholstery retain their silhouettes. New architecture is included in that total.</p></div></div>
<h2>Matched geometry inspection</h2><img src="docs/media/duderworld-0.5.1-budget.png" alt="Close and medium plant, furniture and small-trim comparisons">
<h2>Honest timing tradeoffs</h2><p>Paced world GPU median rose 2.809 to 3.333 ms, Voice fell 3.078 to 2.816 ms, and arrival rose 2.716 to 2.867 ms. Four paired runs per view encountered different automatic clock states. This is not a general speedup claim.</p><p>A short static 32-render GPU-query probe measured 3.625 to 3.481 ms per block. It is not interactive frame time or wall-clock throughput. Full methods, ranges and raw records are included.</p>
<h2>Reviewed and verified</h2><p>310 approach and 84 terrace mesh raycasts, 360 layout checks, original recipe regressions, closed trim topology and browser/CLI export parity pass. Positions, normals and colors match exactly. No browser errors or rebuild leaks. Independent review inspected the actual matched renders and timing evidence.</p>
<p>Close shadow aliasing remains. GLB uses Standard material fallbacks; Unity needs its NPR material port and production collision work. No Quest, stereo, thermal, networking or ragdoll qualification. All tests were muted and offscreen, with no physical input or focus changes.</p>
<p><a href="docs/verification-v0-5-1.md">Verification notes</a> &nbsp; <a href="docs/verification-v0-5-1.json">Measured results</a> &nbsp; <a href="evidence/terrace/source-receipt.json">Source receipt</a> &nbsp; <a href="README.md">Build instructions</a></p><p>The six-second silent MP4 is delivered separately. Nothing pushed, merged, published or deployed.</p></main></html>'''
path=ROOT.parent/'Duderworld-0.5.1-terrace-review.zip'
with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED,compresslevel=7) as z:
 for n in names+extras:z.write(ROOT/n,n)
 z.writestr('Duderworld-0.5.1-review.html',report)
 z.writestr('PACKAGE-README.txt',f'Duderworld 0.5.1 local review snapshot\nCommit {commit}\nBranch {branch}\nOpen Duderworld-0.5.1-review.html or duderworld-v0-5-1.html offline.\nSource: npm ci; npm test. The MP4 is a separate attachment.\nThis is a compact source/evidence snapshot, not complete Git history. Older large assets/galleries are retained in the desktop repository and previous packages.\nHistorical profiling commands require the original Git checkout.\nNo remote writes.\n')
with zipfile.ZipFile(path) as z:assert z.testzip() is None;entries=len(z.namelist())
assert path.stat().st_size<10_000_000
manifest={'path':str(path),'bytes':path.stat().st_size,'entries':entries,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),**receipt}
(ROOT/'evidence/terrace/package-manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest))
