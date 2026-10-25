"""Small delivery archives for reviewed 83c673b; full ZIP stays as backup."""
import hashlib,json,pathlib,subprocess,zipfile
ROOT=pathlib.Path(__file__).resolve().parent.parent
DEST=ROOT.parent
COMMIT='83c673bdd9ed86c4b1b747c59d72a8e4d0bfd9cf'
tracked=subprocess.check_output(['git','ls-tree','-r','--name-only',COMMIT],cwd=ROOT,text=True).splitlines()
archives=[]
def archive(name,items,notes):
    path=DEST/name
    with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED,compresslevel=7) as z:
        for rel,data in items:z.writestr(rel,data)
        z.writestr('PACKAGE-README.txt',notes)
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
        entries=len(z.namelist())
    receipt={'path':str(path),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'entries':entries}
    assert receipt['bytes']<10_000_000,receipt
    archives.append(receipt);print(json.dumps(receipt),flush=True)
def blob(rel):return subprocess.check_output(['git','show',f'{COMMIT}:{rel}'],cwd=ROOT)
code=[n for n in tracked if not n.endswith('.glb') and not n.endswith('.png') and n!='duderworld-v0-3.html']
archive('Duderworld-0.4.1-source-and-offline.zip',[(n,blob(n)) for n in code],
 f'Reviewed Duderworld 0.4.1 source snapshot at {COMMIT}.\nOpen duderworld-v0-4-1.html offline. For source development: npm ci; npm run build.\nHistorical binary GLBs and image documentation are omitted to keep delivery small; retained in the full backup and authoritative repository. npm test checks baked GLBs; run npm run bake and npm run bake:archipelago first if using only this source archive. See package.json for scripts.\nNo push, publication or deployment. Desktop qualification only.\n')
unity=['duderworld-archipelago-v0-4-1.glb','duderworld-v0-4-1.world.json','THIRD_PARTY_NOTICES.md']
archive('Duderworld-0.4.1-unity-assets.zip',[(n,blob(n)) for n in unity],
 f'Reviewed Duderworld 0.4.1 assets at {COMMIT}. GLB: 288460 triangles / 192274 vertices / 18 meshes.\nWorld metadata version 4; room entries additive. Coarse island cylinders are not production colliders. Unity import, Quest and EOS integration have not been qualified.\n')
evidence=['duderworld-before-after-contact-sheet.png','after-ui-world.png','after-ui-voice.png','performance-comparison.json','final-tests.txt','functional-checks.json','source-receipt.json','baseline.html']
evidence += [f'{kind}-{view}.png' for kind in ['before','after'] for view in ['world','voice','friends','inside','skate']]
evidence += [f'{kind}-r{i}-metrics.json' for kind in ['before','after'] for i in range(1,4)]
items=[('evidence/'+n,(ROOT/'evidence'/n).read_bytes()) for n in evidence]
items += [('Duderworld-review.html',(ROOT/'Duderworld-review.html').read_bytes()),('README.md',blob('README.md'))]
archive('Duderworld-0.4.1-visual-evidence.zip',items,
 'Verified before/after images, test receipts and initial performance data.\nExtract alongside the source archive for review page links. The silent MP4 is a separate Library attachment; put it in evidence/duderworld-soft-rooms-silent.mp4 to enable the embedded review player.\nThe initial whole-world GPU median rose 2.647 to 2.783 ms; a separate followup investigates variance. This archive preserves the original evidence.\n')
(ROOT/'evidence'/'small-package-manifest.json').write_text(json.dumps(archives,indent=2))
