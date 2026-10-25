"""Package the final local commit without old large binary history."""
import hashlib,json,pathlib,subprocess,zipfile
ROOT=pathlib.Path(__file__).resolve().parent.parent
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
branch=subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()
tracked=subprocess.check_output(['git','ls-tree','-r','--name-only',commit],cwd=ROOT,text=True).splitlines()
names=[]
for n in tracked:
 if n.endswith('.glb') and n not in ['duderworld-archipelago-v0-5-0.glb','duderworld-lobby-v0-2.glb']:continue
 if n.endswith('.png') and n!='docs/media/duderworld-v0-5-0-comparison.png':continue
 if n=='duderworld-v0-3.html':continue
 names.append(n)
extras=['evidence/art/hero-interior.png','evidence/art/hero-room.png','evidence/art/botanical-after.png',
 'evidence/art/functional-checks.json','evidence/art/export-parity.json','evidence/art/final-tests.txt',
 'evidence/art/Duderworld-botanical-kit.blend','evidence/art/blender-botanical-study.png',
 'evidence/art/blender-build.txt','evidence/performance-followup/art-raw.json','evidence/hero-final-metrics.json']
receipt={'repository':'TrentSterling/duderworld','authoritativeBaseline':'f204f2ac5021c02089f0dd96022fb3e6efef8674','preservedCheckpoint':'83c673bdd9ed86c4b1b747c59d72a8e4d0bfd9cf','branch':branch,'commit':commit,'version':'0.5.0','remoteWrites':False}
(ROOT/'evidence/art/source-receipt.json').write_text(json.dumps(receipt,indent=2))
extras.append('evidence/art/source-receipt.json')
report='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>DuderWorld 0.5.0 review</title>
<style>body{margin:0;background:#eee4d1;color:#2a4947;font:16px/1.55 system-ui}main{max-width:1150px;margin:auto;padding:36px 24px}h1{font-size:48px;line-height:1.06;letter-spacing:-2px}a{color:#526b68}img,video{width:100%;border-radius:16px}small{color:#637472}.cards{display:grid;grid-template-columns:1fr 1fr;gap:20px}.card{padding:20px;background:#faf4e7;border-radius:18px}@media(max-width:750px){.cards{grid-template-columns:1fr}}</style><main>
<small>TRONT / DUDERWORLD / LOCAL ART CANDIDATE</small><h1>Garden lounges.<br>Soft forms, designed color.</h1>
<p><a href="duderworld-v0-5-0.html">Open the offline world</a> &nbsp; <a href="duderworld-archipelago-v0-5-0.glb">Unity GLB</a> &nbsp; <a href="evidence/art/Duderworld-botanical-kit.blend">Editable Blender plants</a></p>
<img src="docs/media/duderworld-v0-5-0-comparison.png" alt="Actual before and after plant and room renders">
<div class="cards"><div class="card"><h2>Authored geometry</h2><p>Curved leaf blades and petioles, broad-leaf and rosette crowns, ceramic vessels, separate seat cushions, tilted pillows, layered walls, acoustic panels, social badges and tea tables. All seven connected islands and the skate park remain.</p></div><div class="card"><h2>Explicit cost</h2><p>385,348 static triangles, 292,636 vertices and 18 static batches. This is 33.6% more triangles than 0.4.1. The renderer uses no postprocessing chain or alpha foliage. Desktop timings and GPU power-state limitations are documented; no Quest claim.</p></div></div>
<h2>Inside the voice lounge</h2><img src="evidence/art/hero-interior.png" alt="Voice lounge cushions, wall panels and tea table">
<h2>Blender botanical study</h2><img src="evidence/art/blender-botanical-study.png" alt="Background Blender render of the editable plant kit"><p>The game uses original procedural mesh recipes. Blender 4.5.2 produced an editable native asset scene and an independent studio render without opening an interface.</p>
<h2>Verified and still to do</h2><p>310 approach raycasts, 360 layout cases, original recipe regressions, closed-box topology and browser/CLI export parity pass. Actual downloads and repeated rebuilds pass with no browser errors. Independent review resolved hollow primitive faces, overlapping seating, a buried pot band, grounding and unstable leaf-tip normals.</p><p>Small close-range shadow aliasing remains. The NPR shader is a live preview material; GLB carries Standard materials and mesh colors, requiring a Unity material port. Collision proxies are not production colliders. No Unity, Quest, stereo, EOS or ragdoll qualification.</p>
<p><a href="docs/verification-v0-5-0.md">Verification notes</a> &nbsp; <a href="docs/verification-v0-5-0.json">Paired timings</a> &nbsp; <a href="evidence/art/source-receipt.json">Source receipt</a> &nbsp; <a href="README.md">Build instructions</a></p><p>The six-second silent MP4 is delivered separately. No source was pushed, merged, published or deployed.</p></main></html>'''
path=ROOT.parent/'Duderworld-0.5.0-art-review.zip'
with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED,compresslevel=7) as z:
 for n in names:z.write(ROOT/n,n)
 for n in extras:z.write(ROOT/n,n)
 z.writestr('Duderworld-0.5.0-review.html',report)
 z.writestr('PACKAGE-README.txt',f'Duderworld 0.5.0 local art candidate\nCommit {commit}\nBranch {branch}\nOpen Duderworld-0.5.0-review.html or duderworld-v0-5-0.html offline.\nSource: npm ci; npm test. Native Blender file is in evidence/art/.\nThe silent MP4 is a separate attachment. Historical large assets and image galleries are omitted here but preserved in the repository/full previous backup.\nNPR shader is not encoded into GLB; Standard material fallback is supplied.\nNothing pushed or deployed.\n')
with zipfile.ZipFile(path) as z:assert z.testzip() is None;entries=len(z.namelist())
assert path.stat().st_size<10_000_000
manifest={'path':str(path),'bytes':path.stat().st_size,'entries':entries,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),**receipt}
(ROOT/'evidence/art/package-manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest))
