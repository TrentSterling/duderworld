import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {buildCoast,SITES} from '../src/coast-world.mjs';
import {PALETTE_KEYS} from '../src/coast-kit.mjs';
const materials={matte:new THREE.MeshStandardMaterial({roughness:.94}),hero:new THREE.MeshStandardMaterial({roughness:.82})};
function hashWorld(world){const hash=createHash('sha256');world.root.traverse(o=>{if(o.isMesh){for(const a of ['position','normal','uv'])hash.update(Buffer.from(o.geometry.attributes[a].array.buffer));hash.update(Buffer.from(o.geometry.index.array.buffer));}});return hash.digest('hex');}
function dispose(world){for(const root of [world.root,world.crowd])root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
function check(world){
  world.root.updateMatrixWorld(true);let triangles=0,vertices=0,meshes=0,minArea=Infinity;const mat=new Set();
  world.root.traverse(o=>{
    if(!o.isMesh)return;meshes++;mat.add(o.material);
    assert.equal(o.material.transparent,false);assert.equal(o.material.opacity,1);assert.equal(o.material.alphaTest,0);
    assert.equal(o.material.metalness,0);assert.ok(o.material.roughness>=.8);
    const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,idx=g.index;
    assert.equal(g.groups.length,0,'One batch must not hide multiple material draws');
    assert.ok(idx&&idx.count%3===0);assert.equal(p.count,n.count);assert.equal(p.count,uv.count);
    triangles+=idx.count/3;vertices+=p.count;
    for(let i=0;i<p.count;i++){
      for(let k=0;k<3;k++)assert.ok(Number.isFinite(p.array[i*3+k])&&Number.isFinite(n.array[i*3+k]));
      assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.002,'Unit normal');
      const u=uv.getX(i),v=uv.getY(i);assert.ok(u>0&&u<1&&v>0&&v<1,'UV in atlas');
      const slot=Math.floor(u*8)+Math.floor((1-v)*8)*8;assert.ok(slot<PALETTE_KEYS.length,'Valid palette swatch');
      assert.ok(Math.abs(u*8%1-.5)<1e-5,'Horizontal atlas gutter');
      const vv=(1-v)*8%1;assert.ok(vv>=.279&&vv<=.721,'Vertical atlas gutter');
    }
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),ns=new THREE.Vector3();
    for(let i=0;i<idx.count;i+=3){
      const ids=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];assert.ok(ids.every(k=>k>=0&&k<p.count));
      a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);
      b.sub(a).cross(c.sub(a));const area=b.length();minArea=Math.min(minArea,area);
      assert.ok(area>1e-10,`${o.name}: degenerate triangle ${i/3}`);
      ns.set(0,0,0);for(const k of ids)ns.add(new THREE.Vector3().fromBufferAttribute(n,k));
      assert.ok(b.dot(ns)>-1e-5,`${o.name}: normal opposed to winding`);
    }
  });
  assert.equal(mat.size,2);assert.equal(meshes,world.stats.draws);assert.equal(triangles,world.stats.triangles);assert.equal(vertices,world.stats.vertices);
  assert.ok(meshes<=10);assert.ok(triangles<230000);
  return {triangles,vertices,meshes,minArea};
}
const world=buildCoast(materials),report=check(world);
const meshes=[];world.root.traverse(o=>{if(o.isMesh)meshes.push(o);});
const ray=new THREE.Raycaster(),surface=(x,z)=>{ray.set(new THREE.Vector3(x,20,z),new THREE.Vector3(0,-1,0));return ray.intersectObjects(meshes,false)[0]?.point.y;};
assert.ok(Math.abs(surface(25.2,6.0)+1.0)<.04,'Bowl is recessed and not covered by a deck');
assert.ok(Math.abs(surface(0,4.3)-.697)<.08,'Hub spawn on paving');
assert.ok(Math.abs(surface(-22,9)-SITES.beach.y)<.05,'Beach spawn on sand');
for(const br of world.metadata.bridges){
  for(const t of [.1,.5,.9]){
    const x=THREE.MathUtils.lerp(br.start[0],br.end[0],t),z=THREE.MathUtils.lerp(br.start[2],br.end[2],t);
    assert.ok(Math.abs(surface(x,z)-.71)<.12,'Bridge has connected deck');
  }
}
// The skirts must face outward; this catches the initial back-face-only cliff bug.
ray.set(new THREE.Vector3(0,-1.2,12),new THREE.Vector3(0,0,-1));
assert.ok(ray.intersectObjects(world.chunks.hub.children,false).length>0,'Front cliff has outward faces');
const hash=hashWorld(world),same=buildCoast(materials);assert.equal(hashWorld(same),hash);dispose(same);
const different=buildCoast(materials,{seed:42});assert.notEqual(hashWorld(different),hash);dispose(different);
const bare=buildCoast(materials,{greenery:false});check(bare);assert.ok(bare.stats.triangles<world.stats.triangles);dispose(bare);
assert.throws(()=>buildCoast(materials,{seed:NaN}));
console.log(JSON.stringify({pass:true,...report,geometrySHA256:hash,checks:['finite indexed geometry','unit normals and nondegenerate winding','atlas UV gutters','two opaque matte materials','no hidden groups','recessed bowl raycast','hub/beach landing raycasts','bridge deck raycasts','outward cliff faces','deterministic recipe','seed variation','greenery variation']},null,2));
dispose(world);
