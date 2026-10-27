// Botanical geometry regressions. Uses the actual merged meshes and triangle data.
import {strict as assert} from 'node:assert';
import * as THREE from 'three';
import {Batch} from '../src/coast-kit.mjs';
import {solidLeaf,palm,planter,coastalRock,ISLETS,offshore} from '../src/coast-botany.mjs';
const materials={matte:new THREE.MeshStandardMaterial({roughness:.94}),hero:new THREE.MeshStandardMaterial({roughness:.82})};
const report={pass:false,leafCases:0,outwardRockRays:0,assets:[]};
function finish(name,fn){const b=new Batch(name);fn(b);return b.finish(materials);}
function dispose(root){root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
function leafClosed(mesh){
  const p=mesh.geometry.attributes.position,idx=mesh.geometry.index;
  const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(x=>Math.round(x*1e6)).join(',');
  const edges=new Map();
  for(let j=0;j<idx.count;j+=3){const ids=[idx.getX(j),idx.getX(j+1),idx.getX(j+2)];
    for(let k=0;k<3;k++){
      const a=key(ids[k]),b=key(ids[(k+1)%3]);assert.notEqual(a,b,'Leaf edge must have length');
      const sorted=a<b?a+'|'+b:b+'|'+a,sign=a<b?1:-1;
      const edge=edges.get(sorted)||{count:0,direction:0};edge.count++;edge.direction+=sign;edges.set(sorted,edge);
    }
  }
  for(const edge of edges.values()){assert.equal(edge.count,2,'Solid leaf must be closed');assert.equal(edge.direction,0,'Leaf edge orientations must agree');}
}
for(const steps of [2,4,5])for(const rise of [-.06,.35,.8])for(const yaw of [0,.73,2.6]){
  const root=finish('leaf',b=>solidLeaf(b,[0,0,0],yaw,.7,.18,rise,.15,'leaf',steps));
  assert.equal(root.children.length,1);leafClosed(root.children[0]);report.leafCases++;dispose(root);
}
const rock=finish('rock',b=>coastalRock(b,0,0,0,2,1.3,3,902));rock.updateMatrixWorld(true);
const ray=new THREE.Raycaster();
for(const y of [.35,1,1.8,2.6])for(let i=0;i<12;i++){
  const a=i*Math.PI/6,origin=new THREE.Vector3(Math.cos(a)*4,y,Math.sin(a)*4),dir=new THREE.Vector3(-Math.cos(a),0,-Math.sin(a));
  ray.set(origin,dir);ray.far=6;
  const hit=ray.intersectObjects(rock.children,false)[0];assert.ok(hit,'Weathered rock must be visible from outside');
  assert.ok(hit.distance<4,'Front face, not the far side, must be hit');report.outwardRockRays++;
}
dispose(rock);
for(const [name,fn,limit] of [
  ['palm',b=>palm(b,0,0,0,4.2,.3),5000],
  ['planter',b=>planter(b,0,0,0,1,.2),2300],
  ['offshore',b=>offshore(b,{seed:20261027,greenery:true}),60000]
]){
  const root=finish(name,fn);assert.equal(root.children.length,1,'All botanical models share one matte batch');
  const mesh=root.children[0],g=mesh.geometry;assert.equal(mesh.material,materials.matte);assert.equal(g.groups.length,0);
  const triangles=g.index.count/3;assert.ok(triangles<limit,name+' triangle budget');
  if(name==='planter'){
    const p=g.attributes.position;
    for(let i=0;i<p.count;i++)assert.ok(Math.hypot(p.getX(i),p.getZ(i))<.61,'Planter foliage stays in its existing footprint');
  }
  report.assets.push({name,triangles,draws:1});dispose(root);
}
assert.equal(ISLETS.length,6);
assert.deepEqual(ISLETS.map(s=>[s.x,s.z]),[[-17,-17],[17,-18],[7,17],[-34,-2],[33,-9],[-5,20]]);
assert.ok(ISLETS.some(s=>s.palms===0)&&ISLETS.some(s=>s.palms===2),'Offshore composition must not repeat a single palm everywhere');
report.pass=true;console.log(JSON.stringify(report,null,2));
