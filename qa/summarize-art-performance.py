import json,pathlib,statistics
ROOT=pathlib.Path(__file__).resolve().parent.parent
raw=json.loads((ROOT/'evidence/performance-followup/art-raw.json').read_text());result={}
for contrast in ['art-world','art-voice']:
 result[contrast]={}
 for variant in ['reviewed','current']:
  runs=[r for r in raw['runs'] if r['contrast']==contrast and r['variant']==variant]
  medians=[r['gpu']['median'] for r in runs]
  result[contrast][variant]={'medianOfRunMediansMs':statistics.median(medians),'runMediansMs':medians,'rangeMs':[min(medians),max(medians)],
   'allPassDraws':runs[0]['render']['calls'],'allPassTriangles':runs[0]['render']['triangles'],
   'shortQueryCounts':[sum(q['ms']<.5 for q in r['timedQueries']) for r in runs],
   'drawCountsAcrossQueries':sorted(set(q['render']['calls'] for r in runs for q in r['timedQueries'])),
   'gpuStatesAfterRuns':[r['hardwareAfter'] for r in runs]}
out={'method':'Three counterbalanced pairs per view; 60 warmup frames and 240 GPU queries per run; fixed avatar time; 1600x1000 DPR1; headless muted Chromium; RTX5070Ti ANGLE D3D11.',
 'limitations':'GPU clocks were not locked and P3/P5 states changed. These observations do not establish a reliable speedup. The first world pair overlapped CPU-only geometry validation; no concurrent GPU tests. Pot grounding and deterministic leaf-tip normals were corrected after paired timing (same triangles/materials/draws; 3999 more welded vertices). Final single-run timings recorded separately. Not Quest/Unity/stereo/EOS qualification.',
 'timedCurrentSha256':raw['currentSha256'],'checkpointSha256':raw['reviewedSha256'],'views':result,'errors':raw['errors']}
(ROOT/'docs/verification-v0-5-0.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
