"""Independent coplanar overlap audit of baked triangles. Python QA only."""
from pathlib import Path
import json, numpy as np, sys
from collections import defaultdict
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely.strtree import STRtree
root=Path(sys.argv[1]);manifest=json.loads((root/'manifest.json').read_text());planes=defaultdict(lambda:defaultdict(list));owners={};triangles=0
for m in manifest:
 name=m['file'];p=np.fromfile(root/f'{name}-position.bin',dtype='<f4').reshape(-1,3).astype(float)
 idx=np.fromfile(root/f'{name}-index.bin',dtype='<u4').reshape(-1,3);pts=p[idx]
 ns=np.cross(pts[:,1]-pts[:,0],pts[:,2]-pts[:,0]);ln=np.linalg.norm(ns,axis=1);good=ln>1e-9;ns[good]/=ln[good,None];d=(ns*pts[:,0]).sum(axis=1)
 # Plane quantization groups nominal coplanarity, with a ~0.1 mm tolerance.
 keys=np.column_stack((np.round(ns*1e4),np.round(d*1e4))).astype(np.int64)
 ids=np.full(len(idx),-1)
 for i,part in enumerate(m['parts']):
  start=part['indexStart']//3;end=start+part['indexCount']//3;ids[start:end]=i
  own=(m['name'],i);owners[own]={'mesh':m['name'],'part':i,'label':part['name'],'center':pts[start:end].mean(axis=(0,1)).tolist() if end>start else [],'bounds':[pts[start:end].min(axis=(0,1)).tolist(),pts[start:end].max(axis=(0,1)).tolist()] if end>start else []}
 for i in np.flatnonzero(good):
  key=tuple(keys[i]);planes[key][(m['name'],int(ids[i]))].append(pts[i]);triangles+=1
print('triangles',triangles,'planes',len(planes),flush=True)
findings=[]
for key,group in planes.items():
 if len(group)<2:continue
 normal=np.array(key[:3],float);normal/=np.linalg.norm(normal);axis=np.argmax(np.abs(normal));axes=[x for x in range(3) if x!=axis]
 polys=[];own=[]
 for owner,points in group.items():
  shape=unary_union([Polygon(p[:,axes]) for p in points]);
  if not shape.is_valid:shape=shape.buffer(0)
  if shape.area>1e-8:polys.append(shape);own.append(owner)
 tree=STRtree(polys)
 for i,a in enumerate(polys):
  for j in tree.query(a,predicate='intersects'):
   if i>=j:continue
   inter=a.intersection(polys[j]);area=inter.area/max(abs(normal[axis]),1e-8)
   if area<1e-6:continue
   c=inter.representative_point();v=np.zeros(3);v[axes]=[c.x,c.y];v[axis]=(key[3]/1e4-np.dot(normal,v))/normal[axis]
   findings.append({'area':float(area),'normal':normal.tolist(),'sample':v.tolist(),'a':owners[own[i]],'b':owners[own[j]]})
findings.sort(key=lambda x:-x['area'])
(root/'coplanar.json').write_text(json.dumps({'count':len(findings),'areaSum':sum(x['area'] for x in findings),'findings':findings},indent=2))
print('pairs',len(findings),'area',sum(x['area'] for x in findings))
for f in findings[:45]:print(round(f['area'],5),[round(x,3) for x in f['sample']], f['a']['mesh'],f['a']['part'], f['a']['label'],'<>', f['b']['mesh'],f['b']['part'], f['b']['label'])
