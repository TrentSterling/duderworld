import assert from 'node:assert/strict';
import {MeshBucket} from '../src/world.mjs';
import {roundedBox} from '../src/sculpted-primitives.mjs';
for(const size of [[1.4,.43,1.46],[1.03,.83,.4],[4,.3,8],[1.19,.21,.07],[.1,.2,.025]]){
 const b=new MeshBucket('closed box');roundedBox(b,[0,0,0],size,.19,[200,150,170],5);const d=b.output();
 const key=i=>Array.from(d.positions.slice(i*3,i*3+3)).map(v=>Math.round(v*100000)).join(',');
 const edges=new Map(),faces=new Set();
 for(let i=0;i<d.indices.length;i+=3){
  const ids=Array.from(d.indices.slice(i,i+3),key),face=[...ids].sort().join('|');
  assert(!faces.has(face),'Duplicate face');faces.add(face);
  for(let j=0;j<3;j++){const edge=[ids[j],ids[(j+1)%3]].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}
 }
 assert([...edges.values()].every(n=>n===2),'Open or nonmanifold box surface');
 const directions=new Set();for(let i=0;i<d.normals.length;i+=3)for(let axis=0;axis<3;axis++)if(Math.abs(d.normals[i+axis])>.999)directions.add(axis+':'+Math.sign(d.normals[i+axis]));
 assert.equal(directions.size,6,'Missing axial face');
}
console.log(JSON.stringify({pass:true,closedRoundedBoxCases:5,checks:['six axial faces','no duplicate faces','two incident triangles at every geometric edge','reduced tiny trim topology']}));
