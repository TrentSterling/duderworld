// Geometry-preserving batching/packing and planar-clipping regressions.
import {strict as assert} from 'node:assert';
import * as THREE from 'three';
import {Batch,geometry} from '../src/coast-kit.mjs';
import {trimCoplanarCoverage} from '../src/coast-optimize.mjs';
import {buildCoast} from '../src/coast-world.mjs';
const materials={matte:new THREE.MeshStandardMaterial({roughness:.94}),hero:new THREE.MeshStandardMaterial({roughness:.82})};
const quad=(x,y,z=0)=>geometry([[x,y,z],[x+1,y,z],[x+1,y+1,z],[x,y+1,z]],[0,1,2,0,2,3]);
function area(root){let total=0;root.traverse(m=>{if(!m.isMesh)return;const g=m.geometry,p=g.attributes.position,ix=g.index;for(let i=0;i<ix.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(p,ix.getX(i)),b=new THREE.Vector3().fromBufferAttribute(p,ix.getX(i+1)),c=new THREE.Vector3().fromBufferAttribute(p,ix.getX(i+2));total+=b.sub(a).cross(c.sub(a)).length()/2;}});return total;}
let clippingCases=0;
for(const [x,z,expected] of [[.5,0,1.5],[1,0,2],[2,0,2],[.5,.001,2],[0,0,1]]){
 const batch=new Batch('test');batch.add(quad(0,0),'ivory');batch.add(quad(x,0,z),'coral');const root=batch.finish(materials);trimCoplanarCoverage(root);assert.ok(Math.abs(area(root)-expected)<1e-6);clippingCases++;
 root.traverse(m=>{if(m.isMesh)m.geometry.dispose();});
}
const world=buildCoast(materials),meshes=[];world.root.traverse(o=>{if(o.isMesh)meshes.push(o);});
assert.equal(world.stats.draws,3);assert.equal(meshes.length,3);assert.equal(new Set(meshes.map(m=>m.material)).size,2);
assert.ok(world.stats.geometryBytes<13035668,'Packed buffers must be smaller than the 0.5.2 baseline');
assert.ok(world.stats.triangles<311154,'No added detail or tessellation');
assert.ok(world.metadata.optimization.cleanup.trimmedTriangles>0);assert.ok(world.metadata.optimization.buried.removedTriangles>0);
assert.equal(world.metadata.optimization.batching.beforeDraws,9);
let references=0;
for(const mesh of meshes){
 const g=mesh.geometry;assert.equal(g.groups.length,0);assert.equal(mesh.material.polygonOffset,false);assert.equal(mesh.material.transparent,false);
 assert.ok(g.attributes.position.array instanceof Float32Array);assert.ok(g.attributes.normal.array instanceof Float32Array);
 assert.ok(g.attributes.uv.array instanceof Uint16Array);assert.equal(g.attributes.uv.normalized,true);
 const used=new Set(g.index.array);assert.equal(used.size,g.attributes.position.count,'No unreferenced vertices');
 let cursor=0;for(const part of mesh.userData.parts){assert.equal(part.indexStart,cursor);cursor+=part.indexCount;references++;}assert.equal(cursor,g.index.count);
 const water=mesh.name==='coast.ocean';assert.equal(mesh.castShadow,!water);assert.equal(mesh.receiveShadow,true);
}
assert.equal(Object.keys(world.metadata.optimization.batching.zoneRanges).length,6);
assert.equal(Object.keys(world.metadata.anchors).length,6);
assert.ok(!world.root.getObjectByName('Preview_figures_NOT_EXPORTED'));
console.log(JSON.stringify({pass:true,clippingCases,stats:world.stats,cleanup:world.metadata.optimization.cleanup,buried:world.metadata.optimization.buried,partRanges:references,positionAndNormalType:'float32 unchanged',uvType:'normalized uint16; <= 1/131070 coordinate error'},null,2));
