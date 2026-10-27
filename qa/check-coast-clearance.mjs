// Sample the actual merged render meshes, not hand-authored collision proxies.
import {strict as assert} from 'node:assert';
import * as THREE from 'three';
import {buildCoast,hubPaths,SITES} from '../src/coast-world.mjs';
import {SKATE_PLAN,bowlProfile,bowlPoint} from '../src/coast-skate.mjs';
const mats={matte:new THREE.MeshStandardMaterial(),hero:new THREE.MeshStandardMaterial()};
const world=buildCoast(mats);world.root.updateMatrixWorld(true);
const meshes=[];world.root.traverse(o=>{if(o.isMesh)meshes.push(o);});
const ray=new THREE.Raycaster();ray.far=2.8;
const paths=[...hubPaths(),...SKATE_PLAN.routes.map(p=>({...p,a:[p.a[0]+23,p.a[1]+5],b:[p.b[0]+23,p.b[1]+5],y:.65}))];
function scan(objects){
 const failures=[],reports=[];
 for(const path of paths){
  const dx=path.b[0]-path.a[0],dz=path.b[1]-path.a[1],L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L;
  const n=Math.ceil(L/.32),across=Math.ceil(path.width/.24);let count=0,minY=Infinity,maxY=-Infinity;
  for(let j=0;j<=n;j++)for(let k=0;k<=across;k++){
   const t=j/n,w=(k/across-.5)*path.width,x=path.a[0]+dx*t-uz*w,z=path.a[1]+dz*t+ux*w;
   ray.set(new THREE.Vector3(x,path.y+2.1,z),new THREE.Vector3(0,-1,0));
   const hit=ray.intersectObjects(objects,false)[0];count++;
   if(hit){minY=Math.min(minY,hit.point.y);maxY=Math.max(maxY,hit.point.y);}
   if(!hit||Math.abs(hit.point.y-path.y)>.12)failures.push({path:path.id,x:+x.toFixed(3),z:+z.toFixed(3),height:hit?+hit.point.y.toFixed(3):null,mesh:hit?.object.name});
  }
  reports.push({id:path.id,width:path.width,samples:count,minY,maxY});
 }
 return{reports,failures};
}
const result=scan(meshes);
console.log(JSON.stringify({pass:result.failures.length===0,reports:result.reports,failedSamples:result.failures.length,examples:result.failures.slice(0,18)},null,2));
assert.equal(result.failures.length,0,'Authored paths must be clear at sampled foot and head envelope');
// Tangent and continuity checks on the bowl, independent of its material bands.
for(const a of [0,.6,1.5,3,SKATE_PLAN.bowl.rollInAngle]){
 const p0=bowlProfile(0,a),p1=bowlProfile(1,a);
 assert.ok(Math.abs(p0.h+SKATE_PLAN.bowl.depth)<1e-8);assert.ok(Math.abs(p1.h)<1e-8);
 for(let i=0;i<100;i++){const p=bowlProfile(i/100,a),q=bowlProfile((i+1)/100,a);assert.ok(q.r>=p.r&&q.h>=p.h-1e-8);}
 const first=bowlProfile(.0001,a);assert.ok((first.h-p0.h)/(first.r-p0.r)<.003,'Flat floor has a tangent transition');
}
// Every bowl ring must be below the deck; the center remains genuinely open.
for(const a of [0,1,2,3,4,5]){
 const p=bowlPoint(SITES.skate,a,.46,-1.65);ray.set(new THREE.Vector3(p[0],2.75,p[2]),new THREE.Vector3(0,-1,0));ray.far=8;
 const hit=ray.intersectObjects(meshes,false)[0];assert.ok(hit&&hit.point.y<-.98,'No slab covers the bowl floor');
}
console.log('Bowl continuity and sampled floor checks passed.');
