// Export-safe cleanup and batching. No shader depth offsets or decimation.
// Coplanar duplicate coverage is trimmed using the original vertex attributes.
import * as THREE from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

const PLANE_EPS=2e-5, AREA_EPS=1e-8;
const cross2=(a,b,p,u,v)=>(b[u]-a[u])*(p[v]-a[v])-(b[v]-a[v])*(p[u]-a[u]);
function polygonArea(poly,u,v){let a=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p[u]*q[v]-p[v]*q[u];}return Math.abs(a)*.5;}
function splitPolygon(poly,a,b,u,v,sign){
  const inside=[],outside=[];
  for(let i=0;i<poly.length;i++){
    const p=poly[i],q=poly[(i+1)%poly.length],dp=sign*cross2(a,b,p,u,v),dq=sign*cross2(a,b,q,u,v);
    // One classification shared by both halves avoids thin double-covered strips.
    const pin=dp>=0,qin=dq>=0;(pin?inside:outside).push(p);
    if(pin!==qin){const t=dp/(dp-dq),r=p.map((x,k)=>x+(q[k]-x)*t);inside.push(r);outside.push(r);}
  }
  return {inside,outside};
}
function subtractTriangle(poly,clip,u,v){
  const sign=Math.sign(cross2(clip[0],clip[1],clip[2],u,v));let current=poly,output=[];
  for(let i=0;i<3;i++){
    if(current.length<3)break;
    const {inside,outside}=splitPolygon(current,clip[i],clip[(i+1)%3],u,v,sign);
    if(outside.length>=3&&polygonArea(outside,u,v)>AREA_EPS)output.push(outside);
    current=inside;
  }
  // Ignore mere shared edges: keep the original triangle/attributes untouched.
  if(current.length<3||polygonArea(current,u,v)<=AREA_EPS)return null;
  return output;
}
function bounds(points,u,v){return [Math.min(...points.map(p=>p[u])),Math.max(...points.map(p=>p[u])),Math.min(...points.map(p=>p[v])),Math.max(...points.map(p=>p[v]))];}
const overlap=(a,b)=>Math.min(a[1],b[1])-Math.max(a[0],b[0])>1e-8&&Math.min(a[3],b[3])-Math.max(a[2],b[2])>1e-8;
function vertices(mesh,tri,attributes=false){
  const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,ix=g.index;
  return [0,1,2].map(j=>{const i=ix.getX(tri*3+j),out=[p.getX(i),p.getY(i),p.getZ(i)];if(attributes)out.push(n.getX(i),n.getY(i),n.getZ(i),uv.getX(i),uv.getY(i));return out;});
}
function faceNormal(p){const a=new THREE.Vector3(...p[1]).sub(new THREE.Vector3(...p[0])),b=new THREE.Vector3(...p[2]).sub(new THREE.Vector3(...p[0]));return a.cross(b).normalize().toArray();}
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

// Remove only faces proven wholly inside a solid island deck. The conservative
// inscribed disk is convex; all triangle vertices inside it imply full coverage.
// The skate bowl's bounding rectangle is excluded, as are the deck surfaces.
export function removeBuriedDeckFaces(root,sites){
  let removed=0;
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;const site=sites[mesh.userData.zone];if(!site)return;
    const g=mesh.geometry,p=g.attributes.position,ix=g.index,next=[],parts=[];
    const inside=i=>{const x=p.getX(i),y=p.getY(i),z=p.getZ(i);return y>site.y-.24&&y<site.y+.033&&Math.hypot(x-site.x,z-site.z)<site.r*.93;};
    for(const part of mesh.userData.parts){const start=next.length;
      for(let t=part.indexStart;t<part.indexStart+part.indexCount;t+=3){
        const ids=[ix.getX(t),ix.getX(t+1),ix.getX(t+2)];
        let buried=ids.every(inside);
        if(buried&&mesh.userData.zone==='skate'){
          const xs=ids.map(i=>p.getX(i)-site.x),zs=ids.map(i=>p.getZ(i)-site.z);
          buried=Math.max(...xs)<-3.6||Math.min(...xs)>8.1||Math.max(...zs)<-4.0||Math.min(...zs)>6.0;
        }
        if(buried)removed++;else next.push(...ids);
      }
      parts.push({...part,indexStart:start,indexCount:next.length-start});
    }
    g.setIndex(next);mesh.userData.parts=parts;
  });return {removedTriangles:removed,scope:'Fully enclosed faces within conservative solid-deck volumes only'};
}

// Run before any meshes are globally merged, retaining authoring part ownership.
// Later-authored coverage wins only where positive-area coplanar overlap exists.
export function trimCoplanarCoverage(root){
  const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
  const groups=new Map(),edits=new Map(),report={testedTriangles:0,overlapPairs:0,trimmedTriangles:0,removedTriangles:0,addedTriangles:0};
  for(const mesh of meshes){
    const parts=mesh.userData.parts||[{name:mesh.name,indexStart:0,indexCount:mesh.geometry.index.count}];
    let part=0;
    for(let tri=0;tri<mesh.geometry.index.count/3;tri++){
      while(part<parts.length-1&&tri*3>=parts[part].indexStart+parts[part].indexCount)part++;
      const p=vertices(mesh,tri),n=faceNormal(p),d=dot(n,p[0]);
      const key=n.map(x=>Math.round(x*1e3)).concat(Math.round(d*1e3)).join(',');
      const record={mesh,tri,part,n,d};
      const old=groups.get(key);if(old===undefined)groups.set(key,record);else if(Array.isArray(old))old.push(record);else groups.set(key,[old,record]);
      report.testedTriangles++;
    }
  }
  for(const value of groups.values()){
    if(!Array.isArray(value))continue;
    if(value.every(r=>r.mesh===value[0].mesh&&r.part===value[0].part))continue;
    const n=value[0].n,drop=n.reduce((best,x,i)=>Math.abs(x)>Math.abs(n[best])?i:best,0),[u,v]=[0,1,2].filter(i=>i!==drop);
    // Sweep broad phase over projected triangle bounds; no all-pairs world scan.
    const records=value.map((r,order)=>{const p=vertices(r.mesh,r.tri);return {...r,order,p,box:bounds(p,u,v)};}).sort((a,b)=>a.box[0]-b.box[0]);
    for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length&&records[j].box[0]<records[i].box[1]-1e-8;j++){
      const r=records[i],s=records[j];if(r.mesh===s.mesh&&r.part===s.part||!overlap(r.box,s.box))continue;
      if(dot(r.n,s.n)<1-1e-6||s.p.some(p=>Math.abs(dot(r.n,p)-r.d)>PLANE_EPS))continue;
      const early=r.order<s.order?r:s,late=early===r?s:r;
      let map=edits.get(early.mesh);if(!map){map=new Map();edits.set(early.mesh,map);}
      const old=map.get(early.tri)||[vertices(early.mesh,early.tri,true)];let changed=false,next=[];
      for(const poly of old){
        if(!overlap(bounds(poly,u,v),late.box)){next.push(poly);continue;}
        const pieces=subtractTriangle(poly,late.p,u,v);
        if(pieces===null)next.push(poly);else{next.push(...pieces);changed=true;}
      }
      if(changed){map.set(early.tri,next);report.overlapPairs++;}
    }
  }
  for(const [mesh,changes] of edits){
    if(!changes.size)continue;
    const old=mesh.geometry,attrs=old.attributes,p=[],n=[],uv=[],parts=[];
    for(const part of mesh.userData.parts){
      const start=p.length/3;
      for(let tri=part.indexStart/3;tri<(part.indexStart+part.indexCount)/3;tri++){
        const polygons=changes.get(tri);
        if(polygons===undefined){
          for(let j=0;j<3;j++){const k=old.index.getX(tri*3+j);p.push(attrs.position.getX(k),attrs.position.getY(k),attrs.position.getZ(k));n.push(attrs.normal.getX(k),attrs.normal.getY(k),attrs.normal.getZ(k));uv.push(attrs.uv.getX(k),attrs.uv.getY(k));}
        }else{
          report.trimmedTriangles++;let emitted=0;
          for(const poly of polygons)for(let j=1;j<poly.length-1;j++){
            const points=[poly[0],poly[j],poly[j+1]],a=new THREE.Vector3(...points[1]).sub(new THREE.Vector3(...points[0])),b=new THREE.Vector3(...points[2]).sub(new THREE.Vector3(...points[0]));
            if(a.cross(b).lengthSq()<1e-18)continue;
            for(const t of points){p.push(...t.slice(0,3));const nn=new THREE.Vector3(...t.slice(3,6)).normalize();n.push(nn.x,nn.y,nn.z);uv.push(t[6],t[7]);}emitted++;
          }
          if(!emitted)report.removedTriangles++;else report.addedTriangles+=emitted-1;
        }
      }
      parts.push({...part,indexStart:start,indexCount:p.length/3-start});
    }
    const raw=new THREE.BufferGeometry();raw.setAttribute('position',new THREE.Float32BufferAttribute(p,3));raw.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));raw.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    // A tighter weld keeps clipped edge detail while preserving original shading.
    const g=mergeVertices(raw,1e-6);raw.dispose();
    const pos=g.attributes.position,ni=[];
    for(let j=0;j<g.index.count;j+=3){const ids=[g.index.getX(j),g.index.getX(j+1),g.index.getX(j+2)],a=new THREE.Vector3().fromBufferAttribute(pos,ids[0]),b=new THREE.Vector3().fromBufferAttribute(pos,ids[1]),c=new THREE.Vector3().fromBufferAttribute(pos,ids[2]);
      if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-18)ni.push(...ids);
      else{const part=parts.find(p=>j>=p.indexStart&&j<p.indexStart+p.indexCount);if(part)part._removed=(part._removed||0)+3;}
    }
    let offset=0;for(const part of parts){part.indexStart=offset;part.indexCount-=part._removed||0;delete part._removed;offset+=part.indexCount;}
    g.setIndex(ni);g.computeBoundingBox();g.computeBoundingSphere();
    mesh.geometry=g;mesh.userData.parts=parts;old.dispose();
  }
  return report;
}

// Compact referenced vertices without moving positions or modifying normals.
// Palette UVs fit standard normalized UNSIGNED_SHORT glTF texture coordinates.
export function compactStaticGeometry(g,packUV=false){
  const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,remap=new Int32Array(p.count).fill(-1),positions=[],normals=[],texcoords=[],indices=[];
  for(let j=0;j<g.index.count;j++){
    const old=g.index.getX(j);let id=remap[old];
    if(id===-1){id=positions.length/3;remap[old]=id;positions.push(p.getX(old),p.getY(old),p.getZ(old));normals.push(n.getX(old),n.getY(old),n.getZ(old));
      texcoords.push(uv.getX(old),uv.getY(old));}
    indices.push(id);
  }
  const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));out.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  out.setAttribute('uv',packUV?new THREE.Uint16BufferAttribute(texcoords.map(x=>Math.round(x*65535)),2,true):new THREE.Float32BufferAttribute(texcoords,2));out.setIndex(indices);out.computeBoundingBox();out.computeBoundingSphere();return out;
}

// Retain the original zones in source and index-range metadata. Only the render
// batches are consolidated. Ocean remains separate because it never casts shadows.
export function mergeStaticBatches(root){
  const buckets=new Map(),zoneRanges={};let oldDraws=0;
  root.traverse(o=>{if(o.isMesh){
    const key=o.material.uuid+':'+o.castShadow+':'+o.receiveShadow;
    if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);oldDraws++;
  }});
  const renderRoot=new THREE.Group();renderRoot.name='Static_Batches';
  for(const sources of buckets.values()){
    const first=sources[0],kind=first.userData.materialClass,key=first.castShadow?kind:'ocean';
    const geos=[],parts=[];let offset=0;
    for(const src of sources){
      geos.push(src.geometry);
      const zone=src.userData.zone;
      (zoneRanges[zone]??=[]).push({batch:key,indexStart:offset,indexCount:src.geometry.index.count});
      for(const part of src.userData.parts)parts.push({...part,zone,indexStart:offset+part.indexStart});
      offset+=src.geometry.index.count;
    }
    const combined=mergeGeometries(geos,false);if(!combined)throw Error('Incompatible static mesh attributes');
    const g=compactStaticGeometry(combined,true);combined.dispose();
    g.computeBoundingBox();g.computeBoundingSphere();
    const mesh=new THREE.Mesh(g,first.material);mesh.name='coast.'+key;mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;
    mesh.userData={zone:key,materialClass:kind,parts,sourceZones:[...new Set(parts.map(p=>p.zone))]};renderRoot.add(mesh);
    for(const src of sources){src.removeFromParent();src.geometry.dispose();}
  }
  root.add(renderRoot);
  // Empty zone transforms remain named and available for export/handoff metadata.
  root.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});
  return {beforeDraws:oldDraws,afterDraws:renderRoot.children.length,zoneRanges};
}
